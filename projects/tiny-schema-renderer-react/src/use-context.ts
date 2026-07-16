import { parseData } from './engine';
import type { PageContextValue } from './engine';

export type PageContextApi = {
  getContext: () => PageContextValue;
  setContext: (ctx: Partial<PageContextValue>, clear?: boolean) => void;
  setState: (data: Record<string, unknown>, clear?: boolean) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createPageContext(): PageContextApi {
  let contextValue: PageContextValue = {
    state: {},
    refs: {},
    methods: {},
    cssScopeId: `data-schema-${Math.random().toString(36).slice(2, 8)}`,
  };
  const listeners = new Set<() => void>();

  const attachInternals = (ctx: PageContextValue): PageContextValue => {
    ctx.__getContext = () => contextValue;
    ctx.__pageNotify = notify;
    return ctx;
  };

  const notify = () => {
    contextValue = attachInternals({ ...contextValue });
    listeners.forEach((listener) => listener());
  };

  const setContext = (ctx: Partial<PageContextValue>, clear?: boolean) => {
    if (clear) {
      contextValue = {
        state: {},
        refs: {},
        methods: {},
        cssScopeId: contextValue.cssScopeId ?? `data-schema-${Math.random().toString(36).slice(2, 8)}`,
        ...ctx,
      };
    } else {
      Object.assign(contextValue, ctx);
    }
    attachInternals(contextValue);
    notify();
  };

  attachInternals(contextValue);

  return {
    getContext: () => contextValue,
    setContext,
    setState: (data, clear) => {
      if (clear) contextValue.state = {};
      Object.assign(contextValue.state!, (parseData(data, {}, contextValue) as Record<string, unknown>) || {});
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
