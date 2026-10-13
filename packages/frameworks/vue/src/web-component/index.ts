import GenuiRenderer from '../renderer/GenuiRenderer.ce.vue';
import { defineCustomElement } from 'vue';

export { parseBooleanAttribute, parseJsonAttribute } from './parse-attribute';

export const GenuiRendererElement = defineCustomElement(GenuiRenderer);

export function registerGenuiRenderer(tagName = 'genui-renderer') {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get(tagName)) {
    try {
      customElements.define(tagName, GenuiRendererElement);
    } catch (error) {
      console.error(`Failed to define custom element ${tagName}:`, error);
    }
  }
}

if (typeof window !== 'undefined') {
  registerGenuiRenderer();
}
