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
 * Creates the custom element constructor for the renderer.
 *
 * Unlike Vue / React this is async: `createCustomElement` needs an initialized
 * injector, and Angular only hands one out through `createApplication()`. The factory
 * therefore exposes a `Promise<CustomElementConstructor>`; until it resolves the tag
 * stays undefined, and `customElements.define()` upgrades tags already in the page,
 * so consumers need no extra work.
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

/** Creates the element and registers the tag; await customElements.whenDefined(tagName) */
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
