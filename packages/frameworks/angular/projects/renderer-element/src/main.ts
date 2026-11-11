import { createApplication } from '@angular/platform-browser';
import { createCustomElement } from '@angular/elements';
import { provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { GenuiRenderer, GENUI_MATERIALS } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

const ELEMENT_TAG = 'genui-renderer-ng-element';

type GenuiRendererElement = HTMLElement & {
  ngElementStrategy?: { componentRef?: { instance?: GenuiRenderer } | null } | null;
  rendererInstance?: GenuiRenderer['rendererInstance'];
  getState?: () => Record<string, any>;
  setState?: (state?: Record<string, any>) => void;
  connectedCallback?: () => void;
};

/**
 * 元素插入文档（connect）之前调用 setState 时，Angular 组件实例还不存在，
 * 直接透传会导致状态被丢弃。这里先暂存，等 renderer 就绪后再回填。
 */
const pendingState = new WeakMap<GenuiRendererElement, Record<string, any>>();

function applyPendingState(element: GenuiRendererElement) {
  const instance = element.ngElementStrategy?.componentRef?.instance;
  if (!instance) {
    return;
  }
  const state = pendingState.get(element);
  if (!state) {
    return;
  }
  pendingState.delete(element);
  instance.setState(state);
}

createApplication({
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    { provide: GENUI_MATERIALS, useValue: materials },
  ],
}).then((appRef) => {
  const elementCtor = createCustomElement(GenuiRenderer, {
    injector: appRef.injector,
  });

  let registeredCtor = customElements.get(ELEMENT_TAG);
  if (!registeredCtor) {
    customElements.define(ELEMENT_TAG, elementCtor);
    registeredCtor = elementCtor;
    console.log(`${ELEMENT_TAG} created`);
  }

  // Angular Elements 只把 @Input 暴露成元素属性，这里把 GenuiRenderer 的 state 方法挂到元素原型上，
  // 便于在 Vue / 原生页面中通过 `element.setState()` 回填历史状态。
  const elementProto = registeredCtor.prototype as GenuiRendererElement;

  elementProto.getState = function () {
    return this.ngElementStrategy?.componentRef?.instance?.getState() ?? {};
  };

  elementProto.setState = function (this: GenuiRendererElement, state: Record<string, any> = {}) {
    pendingState.set(this, { ...(pendingState.get(this) || {}), ...state });
    applyPendingState(this);
  };

  // Angular Elements 在 connectedCallback 中同步创建组件实例，
  // 因此在原生 connectedCallback 之后即可安全回填之前暂存的状态。
  const originalConnectedCallback = elementProto.connectedCallback;
  elementProto.connectedCallback = function (this: GenuiRendererElement) {
    originalConnectedCallback?.call(this);
    applyPendingState(this);
  };

  Object.defineProperty(elementProto, 'rendererInstance', {
    configurable: true,
    get() {
      return this.ngElementStrategy?.componentRef?.instance?.rendererInstance ?? null;
    },
  });
});
