import type { ReactNode } from 'react';

export interface ComponentRenderProps<P = Record<string, unknown>> {
  props: P;
  children?: ReactNode;
  emit: (event: string) => void;
  loading?: boolean;
}

export type ComponentRenderer<P = Record<string, unknown>> = (
  renderProps: ComponentRenderProps<P>,
) => ReactNode;

export type ComponentRegistry = Record<string, ComponentRenderer<any>>;

export interface SchemaRendererHandle {
  setContext: (ctx: Record<string, unknown>) => void;
  getContext: () => Record<string, unknown>;
  setState: (state: Record<string, unknown>) => void;
}

/** 基础渲染器 props，对齐 Vue tiny-schema-renderer RenderMain（仅 schema）。 */
export interface SchemaRendererProps {
  schema: import('@opentiny/genui-sdk-core').RootNode | null;
}
