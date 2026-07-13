export type ReactHostContentProps = {
  schema: Record<string, unknown> & { componentName: string };
  generating?: boolean;
  isJsonComplete?: boolean;
  customActions?: Record<string, { execute: (params: unknown, context: Record<string, unknown>) => unknown }>;
  id?: string;
  state?: Record<string, unknown>;
};

export type ReactHostHandle = {
  updateProps: (props: ReactHostContentProps) => void;
  getRendererHandle: () => {
    getContext: () => Record<string, unknown>;
    setState: (state: Record<string, unknown>) => void;
  } | null;
  setContext: (ctx: Record<string, unknown>) => void;
};
