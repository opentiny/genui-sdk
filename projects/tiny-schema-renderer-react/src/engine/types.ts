import type { RootNode, Node, JSExpression, JSFunction } from '@opentiny/genui-sdk-core';

export type { RootNode, Node, JSExpression, JSFunction };

export type PageContextValue = Record<string, unknown> & {
  state?: Record<string, unknown>;
  refs?: Record<string, unknown>;
  methods?: Record<string, (...args: unknown[]) => unknown>;
  cssScopeId?: string;
  callAction?: (name: string, params?: unknown) => unknown;
  /** 内部：model 绑定写入 state 后触发重渲染 */
  __pageNotify?: () => void;
  /** 内部：函数执行时获取最新 context（避免闭包捕获过期 callAction/state） */
  __getContext?: () => PageContextValue;
};

export type RendererSettings = {
  Function?: typeof Function;
  transformJSX?: (code: string) => string;
  /** 外部注入的物料组件表，解耦具体 UI 库依赖 */
  materials?: import('../types').ComponentRegistry;
};
