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
};

createApplication({
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimations(),
    { provide: GENUI_MATERIALS, useValue: materials },
  ]
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

  elementProto.setState = function (state: Record<string, any> = {}) {
    this.ngElementStrategy?.componentRef?.instance?.setState(state);
  };

  Object.defineProperty(elementProto, 'rendererInstance', {
    configurable: true,
    get() {
      return this.ngElementStrategy?.componentRef?.instance?.rendererInstance ?? null;
    },
  });
});
