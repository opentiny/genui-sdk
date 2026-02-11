import SchemaCardRenderer from '../renderer/SchemaCardRenderer.ce.vue';
import { defineCustomElement } from 'vue';

export const SchemaCardRendererElement = defineCustomElement(SchemaCardRenderer);

export function registerSchemaCardRenderer(tagName: string = 'genui-renderer') {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, SchemaCardRendererElement);
  }
}

if (typeof window !== 'undefined') {
  registerSchemaCardRenderer();
}
