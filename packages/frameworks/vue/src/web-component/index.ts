import SchemaCardRenderer from '../renderer/SchemaCardRenderer.ce.vue';
import { defineCustomElement } from 'vue';

export { parseBooleanAttribute, parseJsonAttribute } from './parse-attribute';

export const SchemaCardRendererElement = defineCustomElement(SchemaCardRenderer);

export function registerSchemaCardRenderer(tagName = 'genui-renderer') {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get(tagName)) {
    try {
      customElements.define(tagName, SchemaCardRendererElement);
    } catch (error) {
      console.error(`Failed to define custom element ${tagName}:`, error);
    }
  }
}

if (typeof window !== 'undefined') {
  registerSchemaCardRenderer();
}
