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
