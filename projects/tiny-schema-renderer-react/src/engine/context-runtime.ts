import type { PageContextValue } from './parse-data';

export function getRuntimeCtx(ctx: PageContextValue): PageContextValue {
  return ctx.__getContext?.() ?? ctx;
}

export function getBindCtx(ctx: PageContextValue): PageContextValue {
  return new Proxy(ctx, {
    get(target, prop) {
      const current = getRuntimeCtx(target);
      const value = Reflect.get(current, prop, current);
      return typeof value === 'function' ? value.bind(current) : value;
    },
    set(target, prop, value) {
      return Reflect.set(getRuntimeCtx(target), prop, value);
    },
    has(target, prop) {
      return Reflect.has(getRuntimeCtx(target), prop);
    },
  });
}
