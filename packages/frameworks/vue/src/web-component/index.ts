import SchemaCardRenderer from '../renderer/SchemaCardRenderer.ce.vue';
import { defineCustomElement } from 'vue';

export { parseBooleanAttribute, parseJsonAttribute } from './parse-attribute';

export const SchemaCardRendererElement = defineCustomElement(SchemaCardRenderer);

export function registerSchemaCardRenderer(tagName = 'genui-renderer') {
  if (typeof customElements === 'undefined') return;
  if (!customElements.get(tagName)) {
    customElements.define(tagName, SchemaCardRendererElement);
  }
}

if (typeof window !== 'undefined') {
  registerSchemaCardRenderer();
}
