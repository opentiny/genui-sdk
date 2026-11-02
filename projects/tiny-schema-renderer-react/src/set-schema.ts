import { handleScopedCss, parseData } from './engine';
import { getPageLifeCycleFns, type LifeCycleFn, type LifeCycles } from './life-cycles';
import type { CardSchema } from './types';
import type { PageContextApi } from './use-context';

const schemaMethodKeys = new WeakMap<PageContextApi, Set<string>>();

function reset(obj: Record<string, unknown>) {
  Object.keys(obj).forEach((key) => delete obj[key]);
}

function setPageCss(content: string | undefined, id: string) {
  if (!content || typeof document === 'undefined') {
    return;
  }

  let styleSheet = document.getElementById(id);
  if (!styleSheet) {
    styleSheet = document.createElement('style');
    styleSheet.id = id;
    document.head.appendChild(styleSheet);
  }

  handleScopedCss(id, content).then(
    (scopedCss) => {
      styleSheet.textContent = scopedCss.css;
    },
    (error) => {
      console.error('SchemaRenderer scope css error:', error);
    },
  );
}

export function setMethods(data: Record<string, unknown> = {}, contextApi: PageContextApi, clear?: boolean) {
  const methodContext = clear ? { ...contextApi.getContext() } : contextApi.getContext();
  if (clear) {
    schemaMethodKeys.get(contextApi)?.forEach((key) => delete methodContext[key]);
  }

  const methods = Object.fromEntries(
    Object.keys(data).map((key) => {
      const parsed = parseData(data[key], {}, methodContext);
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

  if (clear) {
    contextApi.setContext({ ...methodContext, ...methods }, true);
    schemaMethodKeys.set(contextApi, new Set(Object.keys(methods)));
    return;
  }

  contextApi.setContext(methods);
  const methodKeys = schemaMethodKeys.get(contextApi) ?? new Set<string>();
  Object.keys(methods).forEach((key) => methodKeys.add(key));
  schemaMethodKeys.set(contextApi, methodKeys);
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

type PageLifeCycleFns = ReturnType<typeof getPageLifeCycleFns>;
type InvokePageOnUnmounted = () => void | Promise<void>;

export interface SetSchemaOptions {
  invokePageOnUnmounted?: InvokePageOnUnmounted;
  setPageOnUnmounted?: (fn: LifeCycleFn | null) => void;
}

export async function setSchema(
  schema: CardSchema | null,
  contextApi: PageContextApi,
  options: SetSchemaOptions = {},
): Promise<PageLifeCycleFns | undefined> {
  const { invokePageOnUnmounted, setPageOnUnmounted } = options;

  try {
    if (!schema || !Object.keys(schema).length) {
      await invokePageOnUnmounted?.();
      return;
    }

    const cssScopeId =
      contextApi.getContext().cssScopeId ?? `data-schema-${Math.random().toString(36).slice(2, 8)}`;
    const nextContext = { ...contextApi.getContext() };
    delete nextContext.state;
    delete nextContext.refs;
    contextApi.setContext({ ...nextContext, state: {}, refs: {}, cssScopeId }, true);

    setMethods(schema.methods as Record<string, unknown> | undefined, contextApi, true);
    setState(schema.state as Record<string, unknown> | undefined, contextApi, true);
    setRefs(schema.refs as Record<string, unknown> | undefined, contextApi, true);

    await invokePageOnUnmounted?.();

    setPageCss(schema.css, cssScopeId);

    const lifeCycleFns = getPageLifeCycleFns(schema.lifeCycles as LifeCycles | undefined, contextApi.getContext);
    setPageOnUnmounted?.(lifeCycleFns.onUnmounted);
    try {
      await lifeCycleFns.onMounted?.();
    } catch (error) {
      console.error('SchemaRenderer onMounted error:', error);
    }

    return lifeCycleFns;
  } catch (error) {
    console.error('SchemaRenderer initialization error:', error);
  }
}
