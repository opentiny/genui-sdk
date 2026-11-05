/**
 * Angular 端工厂入口。
 *
 * 这个文件由 `@angular/compiler-cli`（ngc）预编译成 `dist/frameworks/angular/index.js`，
 * 组件的模板在构建期完成编译，使用方不需要 Angular 编译工具链。
 */
export {
  createGenuiConfigRendererElement,
  defineGenuiConfigRenderer,
  GENUI_CONFIG_RENDERER_TAG,
} from './create-element';
