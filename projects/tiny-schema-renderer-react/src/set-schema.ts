import { parseData, handleScopedCss } from './engine';
import { getPageLifeCycleFns, type LifeCycles } from './life-cycles';
import type { CardSchema } from './types';
import type { PageContextApi } from './use-context';

const schemaMethodKeys = new WeakMap<PageContextApi, Set<string>>();

function reset(obj: Record<string, unknown>) {
  Object.keys(obj).forEach((key) => delete obj[key]);
}

export function setMethods(data: Record<string, unknown> = {}, contextApi: PageContextApi, clear?: boolean) {
  const methods = Object.fromEntries(
    Object.keys(data).map((key) => {
      const parsed = parseData(data[key], {}, contextApi.getContext());
      return [
        key,
        (...args: unknown[]) => {
          if (typeof parsed !== 'function') {
            return undefined;
          }
          return parsed.call(contextApi.getContext(), ...args);
        },
      ];
    }),
  );

  contextApi.setContext(methods);
}

export function setState(data: Record<string, unknown> | undefined, contextApi: PageContextApi, clear?: boolean) {
  if (!data) {
    if (clear) {
      contextApi.setContext({ state: {} });
    }
    return;
  }
  const parsed = (parseData(data, {}, contextApi.getContext()) as Record<string, unknown>) || {};
  const prev = contextApi.getContext().state ?? {};
  contextApi.setContext({ state: clear ? { ...parsed } : { ...prev, ...parsed } });
}

export function setRefs(data: Record<string, unknown> | undefined, contextApi: PageContextApi, clear?: boolean) {
  const refs = (contextApi.getContext().refs ?? {}) as Record<string, unknown>;
  if (clear) {
    reset(refs);
  }
  if (!data) {
    return;
  }
  Object.assign(refs, (parseData(data, {}, contextApi.getContext()) as Record<string, unknown>) || {});
}

export function setSchema(schema: CardSchema, contextApi: PageContextApi) {
  const cssScopeId = contextApi.getContext().cssScopeId ?? `data-schema-${Math.random().toString(36).slice(2, 8)}`;
  const nextContext = { ...contextApi.getContext() };
  delete nextContext.state;
  delete nextContext.refs;
  schemaMethodKeys.get(contextApi)?.forEach((key) => delete nextContext[key]);
  contextApi.setContext({ ...nextContext, state: {}, refs: {}, cssScopeId }, true);

  setMethods(schema.methods as Record<string, unknown> | undefined, contextApi, true);
  schemaMethodKeys.set(contextApi, new Set(Object.keys(schema.methods ?? {})));
  setState(schema.state as Record<string, unknown> | undefined, contextApi, true);
  setRefs(schema.refs as Record<string, unknown> | undefined, contextApi, true);

  if (schema.css && typeof document !== 'undefined') {
    const id = contextApi.getContext().cssScopeId!;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    handleScopedCss(id, schema.css).then(
      (scopedCss) => {
        el!.textContent = scopedCss.css;
      },
      (error) => {
        console.error('SchemaRenderer scope css error:', error);
      },
    );
  }

  return getPageLifeCycleFns(schema.lifeCycles as LifeCycles | undefined, contextApi.getContext);
}
