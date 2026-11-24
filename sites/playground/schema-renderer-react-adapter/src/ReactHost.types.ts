import type { IRendererExpose, IRendererProps } from '@opentiny/genui-sdk-react';

export type ReactHostContentProps = IRendererProps;

export type ReactHostHandle = {
  updateProps: (props: ReactHostContentProps) => void;
  getRendererHandle: () => IRendererExpose | null;
  setContext: (ctx: Record<string, unknown>) => void;
  setState: (state?: Record<string, unknown>) => void;
};
