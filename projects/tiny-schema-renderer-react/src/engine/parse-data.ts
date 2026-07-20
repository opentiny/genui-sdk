import { getRuntimeCtx } from './context-runtime';
import { parseExpression, isJSExpression, newFn } from './parse-expression';

export type PageContextValue = Record<string, unknown> & {
  state?: Record<string, unknown>;
  refs?: Record<string, unknown>;
  methods?: Record<string, (...args: unknown[]) => unknown>;
  cssScopeId?: string;
  callAction?: (name: string, params?: unknown) => unknown;
  __pageNotify?: () => void;
  __getContext?: () => PageContextValue;
};

const JS_EXPRESSION = 'JSExpression';
const JS_FUNCTION = 'JSFunction';
const JS_SLOT = 'JSSlot';
const JS_RESOURCE = 'JSResource';

const isJSFunction = (data: unknown) =>
  !!(data && typeof data === 'object' && (data as { type?: string }).type === JS_FUNCTION);
const isJSSlot = (data: unknown) =>
  !!(data && typeof data === 'object' && (data as { type?: string }).type === JS_SLOT);
const isJSResource = (data: unknown) =>
  !!(data && typeof data === 'object' && (data as { type?: string }).type === JS_RESOURCE);
const isString = (data: unknown): data is string => typeof data === 'string';
const isArray = Array.isArray;
const isFunction = (data: unknown): data is (...args: unknown[]) => unknown => typeof data === 'function';
const isObject = (data: unknown) => typeof data === 'object' && data !== null && !isArray(data);

export const isStateAccessor = (stateData: unknown) => {
  const d = stateData as { accessor?: { getter?: { type?: string }; setter?: { type?: string } } };
  return d?.accessor?.getter?.type === JS_FUNCTION || d?.accessor?.setter?.type === JS_FUNCTION;
};

const isFunctionString = (str: unknown) => typeof str === 'string' && (str.includes('function') || str.includes('=>'));

type JSSlotRenderer = (scope?: Record<string, unknown>) => unknown[];

let defaultSlotRenderer:
  | ((children: unknown[], scope: Record<string, unknown>, ctx: PageContextValue) => unknown[])
  | null = null;

export function setDefaultSlotRenderer(
  fn: (children: unknown[], scope: Record<string, unknown>, ctx: PageContextValue) => unknown[],
) {
  defaultSlotRenderer = fn;
}

function generateFn(innerFn: (...args: unknown[]) => unknown, ctx: PageContextValue) {
  return (...args: unknown[]) => {
    try {
      const runtimeCtx = getRuntimeCtx(ctx);
      return innerFn.call(runtimeCtx, ...args);
    } catch (error) {
      console.warn(`Function ${innerFn.name || 'anonymous'} execution error:`, error);
      return undefined;
    }
  };
}

function parseJSFunction(data: { type: string; value: string }, scope: Record<string, unknown>, ctx: PageContextValue) {
  try {
    if (!isFunctionString(data.value)) return undefined;
    if (typeof scope === 'object' && Object.keys(scope).length > 0) {
      return generateFn(
        parseExpression({ type: JS_EXPRESSION, value: data.value }, scope, ctx) as (...args: unknown[]) => unknown,
        ctx,
      );
    }
    const innerFn = newFn(`return ${data.value}`).bind(ctx)() as (...args: unknown[]) => unknown;
    return generateFn(innerFn, ctx);
  } catch (error) {
    console.warn('JSFunction parse error:', error);
    return undefined;
  }
}

function parseJSSlot(
  data: { type: string; value: unknown },
  scope: Record<string, unknown>,
  ctx: PageContextValue,
): JSSlotRenderer {
  const children = Array.isArray(data.value) ? data.value : [];
  return ($scope?: Record<string, unknown>) =>
    defaultSlotRenderer ? defaultSlotRenderer(children, { ...scope, ...$scope }, ctx) : [];
}

function parseObjectData(data: Record<string, unknown>, scope: Record<string, unknown>, ctx: PageContextValue) {
  if (!data) return data;
  if (isStateAccessor(data)) {
    return parseData((data as { defaultValue?: unknown }).defaultValue, scope, ctx);
  }

  const res: Record<string, unknown> = {};
  const entries = Object.entries(data);

  entries.forEach(([key, value]) => {
    if (key === 'slot' && value && typeof value === 'object' && (value as { name?: string }).name) {
      res[key] = (value as { name: string }).name;
    } else {
      res[key] = parseData(value, scope, ctx);
    }
  });

  Object.entries(res).forEach(([key, value]) => {
    if (!key.startsWith('on') || typeof value !== 'function') return;
    const fn = value as (...args: unknown[]) => unknown;
    res[key] = (...args: unknown[]) => {
      const result = fn(...args);
      getRuntimeCtx(ctx).__pageNotify?.();
      return result;
    };
  });

  const refEntry = entries.find(([key, value]) => key === 'ref' && isJSExpression(value));
  if (refEntry) {
    const refExpr = refEntry[1] as { value: string };
    res.ref = parseData({ type: JS_FUNCTION, value: `(instance) => { ${refExpr.value} = instance }` }, scope, ctx);
  }

  if ('className' in res) {
    res.className = res.className;
    if (!res.class) res.class = res.className;
  }

  return res;
}

type ParseHandler = {
  type: (d: unknown) => boolean;
  parseFunc: (d: unknown, scope: Record<string, unknown>, ctx: PageContextValue) => unknown;
};

const parseList: ParseHandler[] = [
  {
    type: isJSExpression,
    parseFunc: (d, s, c) => parseExpression(d as { type: string; value: string; params?: string[] }, s, c),
  },
  { type: isJSFunction, parseFunc: (d, s, c) => parseJSFunction(d as { type: string; value: string }, s, c) },
  { type: isJSResource, parseFunc: (d, s, c) => parseExpression(d as { type: string; value: string }, s, c) },
  { type: isJSSlot, parseFunc: (d, s, c) => parseJSSlot(d as { type: string; value: unknown }, s, c) },
  { type: isString, parseFunc: (d) => (d as string).trim() },
  { type: isArray, parseFunc: (d, s, c) => (d as unknown[]).map((item) => parseData(item, s, c)) },
  { type: isFunction, parseFunc: (d, _s, c) => (d as (...args: unknown[]) => unknown).bind(c) },
  { type: isObject, parseFunc: (d, s, c) => parseObjectData(d as Record<string, unknown>, s, c) },
];

export function parseData(data: unknown, scope: Record<string, unknown>, ctx: PageContextValue): unknown {
  let res = data;
  parseList.some((item) => {
    if (item.type(data)) {
      res = item.parseFunc(data, scope, ctx);
      return true;
    }
    return false;
  });
  return res;
}

export function parseCondition(condition: unknown, scope: Record<string, unknown>, ctx: PageContextValue): boolean {
  if (condition == null) return true;
  return !!parseData(condition, scope, ctx);
}

export function parseLoopArgs(loop: {
  item: unknown;
  index: number;
  loopArgs?: string[];
}): Record<string, unknown> | undefined {
  const { item, index, loopArgs = [] } = loop;
  const body = `return {${loopArgs[0] || 'item'}: item, ${loopArgs[1] || 'index'}: index }`;
  return newFn('item,index', body)(item, index) as Record<string, unknown>;
}

export function getLoopScope({
  scope,
  index,
  item,
  loopArgs,
}: {
  scope: Record<string, unknown>;
  index: number;
  item: unknown;
  loopArgs?: string[];
}): Record<string, unknown> {
  return {
    ...scope,
    ...(parseLoopArgs({ item, index, loopArgs }) || {}),
  };
}
