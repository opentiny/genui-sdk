import { getCustomSettings, DEFAULT_RENDERER_SETTINGS } from './use-custom-setting';
import { getRuntimeCtx } from './context-runtime';
import type { PageContextValue } from './parse-data';

const JS_EXPRESSION = 'JSExpression';

export function newFn(...argv: string[]) {
  const Fn = getCustomSettings().Function ?? DEFAULT_RENDERER_SETTINGS.Function ?? Function;
  return new Fn(...argv);
}

export function parseExpression(
  data: { type: string; value: string; params?: string[] },
  scope: Record<string, unknown>,
  ctx: PageContextValue,
  isJsx = false,
): unknown {
  try {
    const mergeScope: Record<string, unknown> = { ...ctx, ...scope, slotScope: scope };
    let expression = data.value;
    if (isJsx && getCustomSettings().transformJSX) {
      expression = getCustomSettings().transformJSX!(data.value);
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
    if (!isJsx && getCustomSettings().transformJSX) {
      return parseExpression(data, scope, ctx, true);
    }
    return undefined;
  }
}

export function isJSExpression(data: unknown): data is { type: typeof JS_EXPRESSION; value: string; model?: boolean; params?: string[] } {
  return !!(data && typeof data === 'object' && (data as { type?: string }).type === JS_EXPRESSION);
}
