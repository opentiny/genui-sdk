import {
  createContext,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { parseData } from './engine';
import type { CardSchema } from '@opentiny/genui-sdk-core';
import type { PageContextValue } from './engine';
import type { RendererSettings } from './engine';
import { setRendererSettings } from './engine';

export type PageContextStore = {
  getContext: () => PageContextValue;
  setContext: (ctx: Partial<PageContextValue>, clear?: boolean) => void;
  setState: (data: Record<string, unknown>, clear?: boolean) => void;
  subscribe: (listener: () => void) => () => void;
};

const PageContext = createContext<PageContextStore | null>(null);

export function usePageContextStore(): PageContextStore {
  const store = useContext(PageContext);
  if (!store) throw new Error('usePageContextStore must be used within PageContextProvider');
  return store;
}

export function usePageContext(): PageContextValue {
  const store = usePageContextStore();
  return useSyncExternalStore(store.subscribe, store.getContext, store.getContext);
}

export type PageCustomActions = Record<
  string,
  { execute: (params: unknown, context: Record<string, unknown>) => unknown }
>;

export interface PageContextProviderProps {
  children: ReactNode;
  /** 渲染器全局配置，可通过 materials 字段注入外部物料组件表 */
  settings?: RendererSettings;
  initialContext?: Partial<PageContextValue>;
  /** 同步注入，避免 useEffect / initPageFromSchema 时序导致 callAction 尚未就绪 */
  customActions?: PageCustomActions;
}

export function PageContextProvider({
  children,
  settings,
  initialContext,
  customActions,
}: PageContextProviderProps) {
  if (settings) setRendererSettings(settings);

  const [, bump] = useState(0);
  const contextRef = useRef<PageContextValue>({
    state: {},
    refs: {},
    methods: {},
    cssScopeId: `data-schema-${Math.random().toString(36).slice(2, 8)}`,
    ...initialContext,
  });
  const listenersRef = useRef(new Set<() => void>());
  const callActionImplRef = useRef<NonNullable<PageContextValue['callAction']>>();
  const customActionsRef = useRef(customActions);
  customActionsRef.current = customActions;

  const attachInternals = (ctx: PageContextValue): PageContextValue => {
    ctx.__getContext = () => contextRef.current;
    ctx.__pageNotify = notify;
    // 稳定代理：优先 setContext 注入；否则直接读 customActions（不依赖 useEffect 时序）
    ctx.callAction = ((actionName: string, params?: unknown) => {
      const injected = callActionImplRef.current;
      if (typeof injected === 'function') {
        return injected(actionName, params);
      }
      const action = customActionsRef.current?.[actionName];
      if (!action) {
        console.warn(`Action ${actionName} not found`);
        return undefined;
      }
      return action.execute(params, contextRef.current as Record<string, unknown>);
    }) as NonNullable<PageContextValue['callAction']>;
    return ctx;
  };

  const applyContextPatch = (ctx: Partial<PageContextValue>, clear?: boolean) => {
    if (typeof ctx.callAction === 'function') {
      callActionImplRef.current = ctx.callAction;
    }
    const { callAction: _ignored, ...rest } = ctx;

    if (clear) {
      const keep = {
        cssScopeId: contextRef.current.cssScopeId,
        cardId: contextRef.current.cardId,
        customContext: contextRef.current.customContext,
      };
      contextRef.current = attachInternals({
        state: {},
        refs: {},
        methods: {},
        ...keep,
        ...rest,
      });
    } else {
      Object.assign(contextRef.current, rest);
      attachInternals(contextRef.current);
    }
    notify();
  };

  const notify = () => {
    // useSyncExternalStore 用 Object.is 比较快照；原地改 state 时必须换新引用才会触发重渲染
    contextRef.current = attachInternals({ ...contextRef.current });
    bump((v) => v + 1);
    listenersRef.current.forEach((l) => l());
  };

  attachInternals(contextRef.current);

  const storeRef = useRef<PageContextStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = {
      getContext: () => contextRef.current,
      setContext: (ctx, clear) => {
        applyContextPatch(ctx, clear);
      },
      setState: (data, clear) => {
        if (clear) contextRef.current.state = {};
        Object.assign(
          contextRef.current.state!,
          (parseData(data, {}, contextRef.current) as Record<string, unknown>) || {},
        );
        notify();
      },
      subscribe: (listener) => {
        listenersRef.current.add(listener);
        return () => listenersRef.current.delete(listener);
      },
    };
  }

  return <PageContext.Provider value={storeRef.current}>{children}</PageContext.Provider>;
}

export function initPageFromSchema(schema: CardSchema, store: PageContextStore) {
  const current = store.getContext();
  const preserved = {
    cssScopeId: current.cssScopeId,
    cardId: current.cardId,
    customContext: current.customContext,
  };
  store.setContext({ state: {}, refs: {}, methods: {}, ...preserved }, true);

  if (schema.methods) {
    const methods: Record<string, (...args: unknown[]) => unknown> = {};
    Object.keys(schema.methods).forEach((key) => {
      const parsed = parseData(schema.methods![key], {}, store.getContext()) as (
        ...args: unknown[]
      ) => unknown;
      methods[key] = (...args: unknown[]) => {
        const result = parsed.call(store.getContext(), ...args);
        store.getContext().__pageNotify?.();
        return result;
      };
    });
    // 与 Vue tiny-schema-renderer 一致：methods 同时挂到 context 根上，schema 里可写 this.handleSubmit()
    store.setContext({ methods, ...methods });
  }
  if (schema.state) {
    store.setState(structuredClone(schema.state) as Record<string, unknown>, true);
  }
  if (schema.refs) {
    Object.assign(
      store.getContext().refs!,
      (parseData(schema.refs, {}, store.getContext()) as Record<string, unknown>) || {},
    );
  }
  if (schema.css && typeof document !== 'undefined') {
    const id = store.getContext().cssScopeId!;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = schema.css;
  }
}
