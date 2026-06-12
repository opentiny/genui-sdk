import type { PageContextValue } from './types';

export function getRuntimeCtx(ctx: PageContextValue): PageContextValue {
  return ctx.__getContext?.() ?? ctx;
}
