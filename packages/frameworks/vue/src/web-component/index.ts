import SchemaCardRenderer from '../renderer/SchemaCardRenderer.ce.vue';
import { defineCustomElement } from 'vue';

// 将 Vue 组件转为自定义元素类，并传入样式
export const SchemaCardRendererElement = defineCustomElement(SchemaCardRenderer, {});

// 注册自定义元素
export function registerSchemaCardRenderer(tagName: string = 'genui-renderer') {
  if (!customElements.get(tagName)) {
    customElements.define(tagName, SchemaCardRendererElement);
  }
}

// 默认注册
if (typeof window !== 'undefined') {
  registerSchemaCardRenderer();
}
