// 流式渲染器
export { SchemaCardRenderer } from './SchemaCardRenderer';
export { GenuiRenderer } from './GenuiRenderer';

// Context 注入
export { RendererContext, useSchemaRenderer } from './RendererContext';
export type { SchemaRendererComponent } from './RendererContext';
export { MaterialsContext, GenuiConfigProvider, useGenuiMaterials } from './MaterialsContext';
export type { GenuiMaterials, GenuiConfigProviderProps } from './MaterialsContext';

// 配置
export * from './config';

// 类型（不导出 GenuiRendererHandle，已在 GenuiRenderer 中导出）
export type { ICustomAction, IRendererProps } from './renderer.types';