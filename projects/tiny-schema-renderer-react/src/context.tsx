import {
  createContext,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { parseData } from './engine';
import { getPageLifeCycleFns, type LifeCycleFn, type LifeCycles } from './life-cycles';
import type { CardSchema } from '@opentiny/genui-sdk-core';
import type { PageContextValue } from './engine';
import type { IRendererSettings } from './engine';
import { setCustomSettings } from './engine';

export type RendererContextStore = {
  getContext: () => PageContextValue;
  setContext: (ctx: Partial<PageContextValue>, clear?: boolean) => void;
  setState: (data: Record<string, unknown>, clear?: boolean) => void;
  subscribe: (listener: () => void) => () => void;
  invokePageOnUnmounted: () => Promise<void>;
  runPendingOnMounted: () => Promise<void>;
  schedulePageLifeCycles: (lifeCycles: LifeCycles | null | undefined) => void;
};

type CreateRendererContextStoreOptions = {
  initialContext?: Partial<PageContextValue>;
  onNotify?: () => void;
};

/**
 * 创建渲染器上下文 store，供 Provider 与无 Provider 时的默认实例复用。
 */
function createRendererContextStore(options: CreateRendererContextStoreOptions = {}): RendererContextStore {
  const { initialContext, onNotify } = options;
  let contextValue: PageContextValue = {
    state: {},
    refs: {},
    methods: {},
    cssScopeId: `data-schema-${Math.random().toString(36).slice(2, 8)}`,
    ...initialContext,
  };
  const listeners = new Set<() => void>();
  let callActionImpl: NonNullable<PageContextValue['callAction']> | undefined;
  let notify: () => void;
  let pageOnUnmounted: LifeCycleFn | null = null;
  let pendingOnMounted: LifeCycleFn | null = null;

  const invokePageOnUnmounted = async () => {
    const fn = pageOnUnmounted;
    pageOnUnmounted = null;
    if (typeof fn !== 'function') return;
    try {
      await fn();
    } catch (error) {
      console.error('SchemaRenderer onUnmounted error:', error);
    }
  };

  const runPendingOnMounted = async () => {
    const fn = pendingOnMounted;
    pendingOnMounted = null;
    if (typeof fn !== 'function') return;
    try {
      await fn();
      notify();
    } catch (error) {
      console.error('SchemaRenderer onMounted error:', error);
    }
  };

  const schedulePageLifeCycles = (lifeCycles: LifeCycles | null | undefined) => {
    const { onMounted, onUnmounted } = getPageLifeCycleFns(lifeCycles, () => contextValue);
    pageOnUnmounted = onUnmounted;
    pendingOnMounted = onMounted;
  };

  const attachInternals = (ctx: PageContextValue): PageContextValue => {
    ctx.__getContext = () => contextValue;
    ctx.__pageNotify = () => notify();
    ctx.callAction = ((actionName: string, params?: unknown) => {
      if (typeof callActionImpl === 'function') {
        return callActionImpl(actionName, params);
      }
      console.warn(`Action ${actionName} not found`);
      return undefined;
    }) as NonNullable<PageContextValue['callAction']>;
    return ctx;
  };

  notify = () => {
    contextValue = attachInternals({ ...contextValue });
    onNotify?.();
    listeners.forEach((listener) => listener());
  };

  const applyContextPatch = (ctx: Partial<PageContextValue>, clear?: boolean) => {
    if (typeof ctx.callAction === 'function') {
      callActionImpl = ctx.callAction;
    }
    const { callAction: _ignored, ...rest } = ctx;

    if (clear) {
      const keep = {
        cssScopeId: contextValue.cssScopeId,
        cardId: contextValue.cardId,
        customContext: contextValue.customContext,
      };
      contextValue = attachInternals({
        state: {},
        refs: {},
        methods: {},
        ...keep,
        ...rest,
      });
    } else {
      Object.assign(contextValue, rest);
      attachInternals(contextValue);
    }
    notify();
  };

  attachInternals(contextValue);

  return {
    getContext: () => contextValue,
    setContext: (ctx, clear) => {
      applyContextPatch(ctx, clear);
    },
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
    invokePageOnUnmounted,
    runPendingOnMounted,
    schedulePageLifeCycles,
  };
}

let defaultRendererContextStore: RendererContextStore | null = null;

/**
 * 无 RendererContextProvider 时使用的默认 store（如单独挂载 SchemaRenderer）。
 */
function getDefaultRendererContextStore(): RendererContextStore {
  if (!defaultRendererContextStore) {
    defaultRendererContextStore = createRendererContextStore();
  }
  return defaultRendererContextStore;
}

const RendererStoreContext = createContext<RendererContextStore | null>(null);

/**
 * 读取渲染器上下文 store；未包裹 Provider 时回退到模块级默认 store，不抛错。
 */
export function useRendererContextStore(): RendererContextStore {
  const store = useContext(RendererStoreContext);
  return store ?? getDefaultRendererContextStore();
}

/**
 * 订阅当前页面运行时上下文（state / methods / refs 等）。
 */
export function useRendererContext(): PageContextValue {
  const store = useRendererContextStore();
  return useSyncExternalStore(store.subscribe, store.getContext, store.getContext);
}

export interface RendererContextProviderProps {
  children: ReactNode;
  /** 渲染器全局配置（materials、Function 等） */
  'render-settings'?: IRendererSettings;
  initialContext?: Partial<PageContextValue>;
}

/**
 * 包裹 SchemaRenderer，注入渲染器 settings 与页面上下文 store。
 */
export function RendererContextProvider({
  children,
  'render-settings': renderSettings,
  initialContext,
}: RendererContextProviderProps) {
  if (renderSettings) setCustomSettings(renderSettings);

  const [, bump] = useState(0);

  const storeRef = useRef<RendererContextStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = createRendererContextStore({
      initialContext,
      onNotify: () => bump((v) => v + 1),
    });
  }

  return <RendererStoreContext.Provider value={storeRef.current}>{children}</RendererStoreContext.Provider>;
}

export function initPageFromSchema(schema: CardSchema, store: RendererContextStore) {
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
    // methods 同时挂到 context 根上，schema 里可写 this.handleSubmit()
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
  store.schedulePageLifeCycles(schema.lifeCycles as LifeCycles | undefined);
}
