import { parseData } from './engine';
import type { PageContextValue } from './engine';

export type PageContextApi = {
  getContext: () => PageContextValue;
  setContext: (ctx: Partial<PageContextValue>, clear?: boolean) => void;
  setState: (data: Record<string, unknown>, clear?: boolean) => void;
  subscribe: (listener: () => void) => () => void;
  methods: Record<string, (...args: unknown[]) => unknown>;
};

export type StatePath = readonly unknown[];

function isArrayIndex(value: unknown): boolean {
  return typeof value === 'number' || (typeof value === 'string' && /^\d+$/.test(value));
}

function cloneContainer(value: unknown, nextKey?: unknown): Record<PropertyKey, unknown> | unknown[] {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') return { ...(value as Record<PropertyKey, unknown>) };
  return isArrayIndex(nextKey) ? [] : {};
}

export function readPath(source: unknown, path: StatePath): unknown {
  return path.reduce<unknown>((value, key) => {
    if (value == null) return undefined;
    return (value as Record<PropertyKey, unknown>)[key as PropertyKey];
  }, source);
}

/** 按路径不可变更新，返回新对象。updater 为函数时调用旧值得新值；为 undefined 时删除该键。 */
export function setIn(source: unknown, path: StatePath, updater?: unknown | ((prev: unknown) => unknown)): unknown {
  const write = (current: unknown, depth: number): unknown => {
    if (depth === path.length) {
      if (typeof updater === 'function') return (updater as (p: unknown) => unknown)(current);
      if (updater === undefined) return undefined;
      return updater;
    }
    const key = path[depth] as PropertyKey;
    const clone = cloneContainer(current, key) as Record<PropertyKey, unknown>;
    const next = write(current == null ? undefined : (current as Record<PropertyKey, unknown>)[key], depth + 1);
    if (next === undefined) {
      delete clone[key];
    } else {
      clone[key] = next;
    }
    return clone;
  };
  return write(source, 0);
}

export function createPageContext(): PageContextApi {
  const methods: Record<string, (...args: unknown[]) => unknown> = {};
  let contextValue: PageContextValue = {
    state: {},
    refs: {},
    cssScopeId: `data-schema-${Math.random().toString(36).slice(2, 8)}`,
  };
  const listeners = new Set<() => void>();

  /** 函数式不可变更新，返回新 state 对象 */
  const updateState = (updater: (state: Record<string, unknown>) => Record<string, unknown>) => {
    contextValue.state = updater(contextValue.state ?? {});
    notify();
  };

  const setState = (data: Record<string, unknown>, clear?: boolean) => {
    const parsed = (parseData(data, {}, contextValue) as Record<string, unknown>) || {};
    updateState((prev) => (clear ? { ...parsed } : { ...prev, ...parsed }));
  };

  const attachInternals = (ctx: PageContextValue): PageContextValue => {
    ctx.__getContext = () => contextValue;
    ctx.setState = updateState;
    ctx.setIn = setIn;
    ctx.__rejectStateMutationDuringRender = () => {
      console.warn('State mutations are only allowed inside event handlers, methods, or lifecycle functions.');
      return undefined;
    };
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
        cssScopeId: contextValue.cssScopeId ?? `data-schema-${Math.random().toString(36).slice(2, 8)}`,
        ...ctx,
      };
    } else {
      Object.assign(contextValue, ctx);
    }
    notify();
  };

  attachInternals(contextValue);

  return {
    getContext: () => contextValue,
    setContext,
    setState,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    methods,
  };
}
