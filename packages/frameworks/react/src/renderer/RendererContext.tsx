import { createContext, useContext } from 'react';
import type { SchemaRendererProps, SchemaRendererHandle } from '@opentiny/tiny-schema-renderer-react';

/**
 * 基础渲染器组件类型，对齐 Vue 的 inject(GENUI_RENDERER)。
 * 消费者可通过 <RendererContext.Provider> 注入自定义渲染器。
 */
export type SchemaRendererComponent = React.ForwardRefExoticComponent<
  React.PropsWithoutRef<SchemaRendererProps> & React.RefAttributes<SchemaRendererHandle>
>;

/**
 * 基础渲染器 Context，对齐 Vue 的 inject(GENUI_RENDERER)。
 * SchemaCardRenderer 会从此 Context 读取基础渲染器，
 * 若未提供则回退到 @opentiny/tiny-schema-renderer-react 的默认 SchemaRenderer。
 */
export const RendererContext = createContext<SchemaRendererComponent | null>(null);

/**
 * 获取 Context 中的基础渲染器（可能为 null，由 SchemaCardRenderer 处理默认值）。
 */
export function useSchemaRenderer(): SchemaRendererComponent | null {
  return useContext(RendererContext);
}
