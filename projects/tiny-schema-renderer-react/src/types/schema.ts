/**
 * GenUI Schema 协议类型定义（自 @opentiny/genui-sdk-core 复制，避免运行时依赖）。
 */

export type JSExpression = {
  type: 'JSExpression';
  value: string;
  model?: boolean;
  params?: string[];
};

export type JSFunction = {
  type: 'JSFunction';
  value: string;
  params?: string[];
};

export type Methods = Record<string, JSFunction>;

export interface Node {
  id?: string;
  componentName: string;
  props?: Record<string, any> & { columns?: { slots?: Record<string, any> }[] };
  children?: Node[];
  componentType?: 'Block' | 'PageStart' | 'PageSection';
  slot?: string | Record<string, any>;
  params?: string[];
  loop?: Record<string, any>;
  loopArgs?: string[];
  condition?: boolean | Record<string, any>;
}

export type RootNode = Omit<Node, 'id'> & {
  id?: string;
  css?: string;
  fileName?: string;
  methods?: Methods;
  state?: Record<string, unknown>;
  refs?: Record<string, unknown>;
  lifeCycles?: Record<string, unknown>;
  children?: Node[];
  dataSource?: any;
  bridge?: any;
  inputs?: any[];
  outputs?: any[];
  schema?: any;
};

/** 卡片级 Schema，与 RootNode 结构一致 */
export type CardSchema = RootNode;
