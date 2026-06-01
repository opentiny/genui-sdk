import { newFn, getRendererSettings } from './new-fn';
import { getRuntimeCtx } from './context-runtime';
import type { PageContextValue } from './types';

const JS_EXPRESSION = 'JSExpression';

export function parseExpression(
  data: { type: string; value: string; params?: string[] },
  scope: Record<string, unknown>,
  ctx: PageContextValue,
  isJsx = false,
): unknown {
  try {
    const mergeScope: Record<string, unknown> = { ...ctx, ...scope, slotScope: scope };
    let expression = data.value;
    if (isJsx && getRendererSettings().transformJSX) {
      expression = getRendererSettings().transformJSX!(data.value);
    }
    let params: Record<string, unknown> = {};
    if (data.params?.length) {
      params = data.params.reduce<Record<string, unknown>>((acc, paramName) => {
        acc[paramName] = mergeScope[paramName];
        return acc;
      }, {});
      expression = `(e) => {(${expression}).call(this, e, ${data.params.join(',')})}`;
    }
    return newFn('$scope', `with($scope || {}) { return ${expression} }`).call(getRuntimeCtx(ctx), {
      ...mergeScope,
      ...params,
    });
  } catch {
    if (!isJsx && getRendererSettings().transformJSX) {
      return parseExpression(data, scope, ctx, true);
    }
    return undefined;
  }
}

export function isJSExpression(data: unknown): data is { type: typeof JS_EXPRESSION; value: string; model?: boolean; params?: string[] } {
  return !!(data && typeof data === 'object' && (data as { type?: string }).type === JS_EXPRESSION);
}
