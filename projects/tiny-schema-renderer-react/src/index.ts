// 基础渲染器（default 对齐 Vue tiny-schema-renderer 的 default export）
export { SchemaRenderer } from './Renderer';
export { default } from './Renderer';

// 上下文
export {
  PageContextProvider,
  usePageContext,
  usePageContextStore,
  initPageFromSchema,
} from './context';
export type { PageContextStore, PageCustomActions, PageContextProviderProps } from './context';

// 类型
export type {
  ComponentRenderProps,
  ComponentRenderer,
  ComponentRegistry,
  SchemaRendererHandle,
  SchemaRendererProps,
} from './types';

// 注册表 & 物料工具
export { defineRegistry, mergeRegistry } from './define-registry';
export { defineMaterials, getMaterials, setMaterials } from './materials';

// Engine（公开供外部扩展）
export * from './engine';

// Builtin 组件 & 注册表
export { builtinRegistry, isHtmlTag } from './builtin';
export { Box } from './builtin/Box';
export type { BoxProps } from './builtin/Box';
export { Text } from './builtin/Text';
export { Img } from './builtin/Img';
export { Button } from './builtin/Button';
export { Input } from './builtin/Input';
export { Slot } from './builtin/Slot';
