import { parseData } from './engine';
import type { PageContextValue } from './engine';

export type PageContextApi = {
  getContext: () => PageContextValue;
  setContext: (ctx: Partial<PageContextValue>, clear?: boolean) => void;
  setState: (data: Record<string, unknown>, clear?: boolean) => void;
  subscribe: (listener: () => void) => () => void;
};

/**
 * 创建页面运行时上下文，对齐 Vue useContext.js。
 * 变更通过 subscribe 通知消费端（useSyncExternalStore）。
 */
export function createPageContext(): PageContextApi {
  let contextValue: PageContextValue = {
    state: {},
    refs: {},
    methods: {},
    cssScopeId: `data-schema-${Math.random().toString(36).slice(2, 8)}`,
  };
  const listeners = new Set<() => void>();
  let callActionImpl: NonNullable<PageContextValue['callAction']> | undefined;

  const notify = () => {
    contextValue = attachInternals({ ...contextValue });
    listeners.forEach((listener) => listener());
  };

  const attachInternals = (ctx: PageContextValue): PageContextValue => {
    ctx.__getContext = () => contextValue;
    ctx.__pageNotify = notify;
    ctx.callAction = ((actionName: string, params?: unknown) => {
      if (typeof callActionImpl === 'function') {
        return callActionImpl(actionName, params);
      }
      console.warn(`Action ${actionName} not found`);
      return undefined;
    }) as NonNullable<PageContextValue['callAction']>;
    return ctx;
  };

  const setContext = (ctx: Partial<PageContextValue>, clear?: boolean) => {
    if (typeof ctx.callAction === 'function') {
      callActionImpl = ctx.callAction;
    }
    const { callAction: _ignored, ...rest } = ctx;

    if (clear) {
      Object.keys(contextValue).forEach((key) => {
        delete contextValue[key as keyof PageContextValue];
      });
      Object.assign(contextValue, rest);
    } else {
      Object.assign(contextValue, rest);
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
      Object.assign(
        contextValue.state!,
        (parseData(data, {}, contextValue) as Record<string, unknown>) || {},
      );
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
