import { useRef, useState } from 'react';
import type { PageContextValue } from './engine';
import { attachInternals } from './engine/context-internals';

export type PageContextApi = {
  context: PageContextValue;
  getContext: () => PageContextValue;
  setContext: (ctx: Partial<PageContextValue>, clear?: boolean) => void;
};

export function useContext(): PageContextApi {
  const [context, setContextValue] = useState<PageContextValue>({ refs: {}, state: {} });
  const contextRef = useRef(context);
  contextRef.current = context;
  const contextApiRef = useRef<PageContextApi | null>(null);

  if (!contextApiRef.current) {
    function getContext() {
      return contextRef.current;
    }

    function setContext(ctx: Partial<PageContextValue>, clear?: boolean) {
      const next = clear ? { ...ctx } : { ...contextRef.current, ...ctx };
      contextRef.current = next;
      attachInternals(api);
      setContextValue(next);
    }

    const api: PageContextApi = {
      get context() {
        return contextRef.current;
      },
      getContext,
      setContext,
    };
    attachInternals(api);
    contextApiRef.current = api;
  }

  return contextApiRef.current;
}
