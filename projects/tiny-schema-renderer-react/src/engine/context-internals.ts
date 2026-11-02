import type { PageContextValue } from './parse-data';

export type StatePath = readonly unknown[];

export type ContextApi = {
  getContext: () => PageContextValue;
  setContext: (ctx: Partial<PageContextValue>, clear?: boolean) => void;
};

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

function rejectStateMutationDuringRender() {
  console.warn('State mutations are only allowed inside event handlers, methods, or lifecycle functions.');
  return undefined;
}

export function attachInternals(contextApi: ContextApi) {
  const ctx = contextApi.getContext();
  ctx.__getContext = contextApi.getContext;
  ctx.__setState = (updater: (state: Record<string, unknown>) => Record<string, unknown>) => {
    contextApi.setContext({ state: updater(contextApi.getContext().state ?? {}) });
  };
  ctx.__setIn = setIn;
  ctx.__rejectStateMutationDuringRender = rejectStateMutationDuringRender;
}
