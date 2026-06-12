export * from './engine';
export * from './context';
export * from './builtin';
export * from './renderer';
export * from './hooks';
export { reactRendererConfig, whiteList, examples } from './render-config';

// 从基础渲染器包重新导出，保持向后兼容
export {
  SchemaRenderer,
  PageContextProvider,
  usePageContext,
  usePageContextStore,
  initPageFromSchema,
  defineRegistry,
  mergeRegistry,
  defineMaterials,
  setMaterials,
  getMaterials,
  builtinRegistry as defaultBuiltinRegistry,
  isHtmlTag,
} from '@opentiny/tiny-schema-renderer-react';

export type {
  ComponentRenderProps,
  ComponentRenderer,
  ComponentRegistry,
  SchemaRendererHandle,
  SchemaRendererProps,
} from '@opentiny/tiny-schema-renderer-react';

/** @deprecated 使用 SchemaRendererHandle */
export type GenuiRendererHandle = import('@opentiny/tiny-schema-renderer-react').SchemaRendererHandle;
