import { materialKey, materials } from 'virtual:genui-materials';
import { createGenuiConfigRendererElement } from './create-element';

export { createGenuiConfigRendererElement };
export { materialKey, materials };
export { parseBooleanAttribute, parseJsonAttribute } from './parse-attribute';

export const GENUI_CONFIG_RENDERER_TAG = 'genui-config-renderer';

export const GenuiConfigRendererElement = createGenuiConfigRendererElement(materials);

export function registerGenuiConfigRenderer(
  tagName = GENUI_CONFIG_RENDERER_TAG,
  element: CustomElementConstructor = GenuiConfigRendererElement,
) {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(tagName)) return;
  try {
    customElements.define(tagName, element);
  } catch (error) {
    console.error(`Failed to define custom element ${tagName}:`, error);
  }
}

if (typeof window !== 'undefined') {
  registerGenuiConfigRenderer();
}
