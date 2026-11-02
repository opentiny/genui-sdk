import type { IRendererProps } from '@opentiny/genui-sdk-react';

export type ReactHostContentProps = IRendererProps;

export type ReactHostHandle = {
  updateProps: (props: ReactHostContentProps) => void;
  getRendererHandle: () => {
    getContext: () => Record<string, unknown>;
    setState: (state: Record<string, unknown>) => void;
  } | null;
  setContext: (ctx: Record<string, unknown>) => void;
};
