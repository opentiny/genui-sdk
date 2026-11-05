import { provideZoneChangeDetection } from '@angular/core';
import { createCustomElement } from '@angular/elements';
import { createApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { RENDERER_SETTINGS, type IRendererSettings } from '@opentiny/tiny-schema-renderer-ng';
import type { IMaterials } from '@opentiny/genui-sdk-core';
import { GENUI_MATERIALS } from '@opentiny/genui-sdk-angular';
import { GenuiConfigRendererRoot } from './genui-config-renderer-root';

export const GENUI_CONFIG_RENDERER_TAG = 'genui-config-renderer';

/**
 * 创建渲染器自定义元素的构造函数。
 *
 * 与 Vue / React 的工厂不同，这里是异步的：`@angular/elements` 的 `createCustomElement`
 * 需要一个已经初始化好的 injector，而 Angular 应用只能通过 `createApplication()` 异步拿到。
 * 因此对外暴露的是 `Promise<CustomElementConstructor>`，注册完成前标签保持未定义状态，
 * `customElements.define()` 之后浏览器会自动升级页面里已存在的标签，不需要使用方额外处理。
 */
export function createGenuiConfigRendererElement(materials: IMaterials = {}): Promise<CustomElementConstructor> {
  return createApplication({
    providers: [
      provideZoneChangeDetection({ eventCoalescing: true }),
      provideAnimations(),
      { provide: GENUI_MATERIALS, useValue: materials },
      // 根组件会往这个对象上挂默认的 notify（转成 genui-notify 事件），渲染器复用同一份
      { provide: RENDERER_SETTINGS, useValue: {} as IRendererSettings },
    ],
  }).then((appRef) => createCustomElement(GenuiConfigRendererRoot, { injector: appRef.injector }));
}

/** 创建元素并注册标签；`customElements.whenDefined(tagName)` 可等到注册完成 */
export function defineGenuiConfigRenderer(
  tagName: string = GENUI_CONFIG_RENDERER_TAG,
  materials: IMaterials = {},
): Promise<CustomElementConstructor> {
  return createGenuiConfigRendererElement(materials).then((element) => {
    if (typeof customElements !== 'undefined' && !customElements.get(tagName)) {
      customElements.define(tagName, element);
    }
    return element;
  });
}
