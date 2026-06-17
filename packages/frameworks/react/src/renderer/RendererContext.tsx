import { createContext, useContext } from 'react';
import type { SchemaRendererProps, SchemaRendererHandle } from '@opentiny/tiny-schema-renderer-react';

/**
 * 可注入的基础 Schema 渲染器组件类型。
 */
export type SchemaRendererComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<SchemaRendererProps> & React.RefAttributes<SchemaRendererHandle>
>;

/**
 * 基础渲染器 Context；未提供时 Renderer 回退到默认 SchemaRenderer。
 */
export const RendererContext = createContext<SchemaRendererComponent | null>(null);

/**
 * 获取 Context 中的基础渲染器（可能为 null，由 Renderer 处理默认值）。
 */
export function useSchemaRenderer(): SchemaRendererComponent | null {
  return useContext(RendererContext);
}
