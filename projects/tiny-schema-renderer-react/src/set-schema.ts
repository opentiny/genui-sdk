import { parseData } from './engine';
import { getPageLifeCycleFns, type LifeCycles } from './life-cycles';
import type { CardSchema } from './types';
import type { PageContextApi } from './use-context';

function reset(obj: Record<string, unknown>) {
  Object.keys(obj).forEach((key) => delete obj[key]);
}

export function setMethods(data: Record<string, unknown> = {}, page: PageContextApi, clear?: boolean) {
  const methods = (page.getContext().methods ?? {}) as Record<string, (...args: unknown[]) => unknown>;
  if (clear) {
    reset(methods as unknown as Record<string, unknown>);
  }

  Object.assign(
    methods,
    Object.fromEntries(
      Object.keys(data).map((key) => {
        const parsed = parseData(data[key], {}, page.getContext()) as (...args: unknown[]) => unknown;
        return [
          key,
          (...args: unknown[]) => {
            const result = parsed.call(page.getContext(), ...args);
            page.getContext().__pageNotify?.();
            return result;
          },
        ];
      }),
    ),
  );

  page.setContext({ methods, ...methods });
}

export function setState(data: Record<string, unknown> | undefined, page: PageContextApi, clear?: boolean) {
  if (!data) {
    if (clear) {
      page.setState({}, true);
    }
    return;
  }
  page.setState(data, clear);
}

export function setRefs(data: Record<string, unknown> | undefined, page: PageContextApi, clear?: boolean) {
  const refs = (page.getContext().refs ?? {}) as Record<string, unknown>;
  if (clear) {
    reset(refs);
  }
  if (!data) {
    return;
  }

  Object.assign(refs, (parseData(data, {}, page.getContext()) as Record<string, unknown>) || {});
}

export function setSchema(schema: CardSchema, page: PageContextApi) {
  const cssScopeId = page.getContext().cssScopeId;
  page.setContext({ state: {}, refs: {}, methods: {}, cssScopeId }, true);

  setMethods(schema.methods as Record<string, unknown> | undefined, page, true);
  setState(schema.state as Record<string, unknown> | undefined, page, true);
  setRefs(schema.refs as Record<string, unknown> | undefined, page, true);

  if (schema.css && typeof document !== 'undefined') {
    const id = page.getContext().cssScopeId!;
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = schema.css;
  }

  return getPageLifeCycleFns(schema.lifeCycles as LifeCycles | undefined, page.getContext);
}
