import { parseData } from './engine';
import { getPageLifeCycleFns, type LifeCycles } from './life-cycles';
import type { CardSchema } from './types';
import type { PageContextApi } from './use-context';

/**
 * 清空对象所有自有属性，对齐 Vue RenderMain.reset。
 *
 * @param obj - 待清空的对象
 */
function reset(obj: Record<string, unknown>) {
  Object.keys(obj).forEach((key) => delete obj[key]);
}

/**
 * 将 schema.methods 解析并挂载到页面上下文，对齐 Vue RenderMain.setMethods。
 *
 * @param data - schema.methods 定义
 * @param page - 页面上下文控制器
 * @param clear - 是否在写入前清空已有 methods
 */
export function setMethods(
  data: Record<string, unknown> = {},
  page: PageContextApi,
  clear?: boolean,
) {
  const methods = (page.getContext().methods ?? {}) as Record<
    string,
    (...args: unknown[]) => unknown
  >;
  if (clear) {
    reset(methods as unknown as Record<string, unknown>);
  }

  Object.assign(
    methods,
    Object.fromEntries(
      Object.keys(data).map((key) => {
        const parsed = parseData(data[key], {}, page.getContext()) as (
          ...args: unknown[]
        ) => unknown;
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

/**
 * 将 schema.state 解析并写入页面状态，对齐 Vue RenderMain.setState。
 *
 * @param data - schema.state 定义
 * @param page - 页面上下文控制器
 * @param clear - 是否在写入前清空已有 state
 */
export function setState(
  data: Record<string, unknown> | undefined,
  page: PageContextApi,
  clear?: boolean,
) {
  if (!data) {
    if (clear) {
      page.setState({}, true);
    }
    return;
  }
  page.setState(data, clear);
}

/**
 * 将 schema.refs 解析并写入页面 refs，对齐 Vue RenderMain.setRefs。
 *
 * @param data - schema.refs 定义
 * @param page - 页面上下文控制器
 * @param clear - 是否在写入前清空已有 refs
 */
export function setRefs(
  data: Record<string, unknown> | undefined,
  page: PageContextApi,
  clear?: boolean,
) {
  const refs = (page.getContext().refs ?? {}) as Record<string, unknown>;
  if (clear) {
    reset(refs);
  }
  if (!data) {
    return;
  }

  Object.assign(
    refs,
    (parseData(data, {}, page.getContext()) as Record<string, unknown>) || {},
  );
}

/**
 * 根据 schema 初始化页面上下文，对齐 Vue RenderMain.setSchema 的数据部分。
 *
 * @param schema - 页面 schema
 * @param page - 页面上下文控制器
 * @returns 生命周期回调
 */
export function setSchema(schema: CardSchema, page: PageContextApi) {
  const current = page.getContext();
  const preserved = {
    cssScopeId: current.cssScopeId,
    cardId: current.cardId,
    customContext: current.customContext,
  };
  page.setContext({ state: {}, refs: {}, methods: {}, ...preserved }, true);

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
