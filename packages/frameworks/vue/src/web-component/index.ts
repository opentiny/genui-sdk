import { materialKey, materials } from 'virtual:genui-materials';
import { createGenuiConfigRendererElement } from './create-element';
import { defineGenuiConfigRenderer, GENUI_CONFIG_RENDERER_TAG } from './register';

export { createGenuiConfigRendererElement };
export { materialKey, materials };
export { parseBooleanAttribute, parseJsonAttribute } from './parse-attribute';
export { GENUI_CONFIG_RENDERER_TAG };

export const GenuiConfigRendererElement = createGenuiConfigRendererElement(materials);

export function registerGenuiConfigRenderer(
  tagName = GENUI_CONFIG_RENDERER_TAG,
  element: CustomElementConstructor = GenuiConfigRendererElement,
) {
  defineGenuiConfigRenderer(tagName, element);
}

if (typeof window !== 'undefined') {
  registerGenuiConfigRenderer();
}
