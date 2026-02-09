import SchemaCardRenderer from '../renderer/SchemaCardRenderer.ce.vue';
import { defineCustomElement } from 'vue';
// 内联导入 CSS，以便在 Shadow DOM 中生效
// @ts-ignore - Vite 的 ?inline 后缀在构建时会处理
import tinyVueThemeStyles from '@opentiny/vue-theme/index.css?inline';
// @ts-ignore - Vite 的 ?inline 后缀在构建时会处理
import customStyles from '../renderer/custom.web-component.css?inline';

// 将 Vue 组件转为自定义元素类，并传入样式
export const SchemaCardRendererElement = defineCustomElement(SchemaCardRenderer, {
  styles: [tinyVueThemeStyles, customStyles],
});

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
