import type { PageContextValue } from './parse-data';

export function getRuntimeCtx(ctx: PageContextValue): PageContextValue {
  return ctx.__getContext?.() ?? ctx;
}
