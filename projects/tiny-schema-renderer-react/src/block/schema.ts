import type { RootNode } from '../types';

/**
 * 区块定义协议：对齐物料 bundle 中组件声明的纯类型声明文件（无运行时代码）。
 * BlockSchema 是核心入口，properties / events / slots 三段式声明与 bundle.json 中的组件定义结构一致。
 */

/** 多语言文案：对齐物料 bundle 的 II18nText（zh_CN 为主文案），兼容纯字符串 */
export type BlockI18nText = string | ({ zh_CN?: string } & Record<string, string>);

/** 属性声明项，对齐物料 bundle 的 IPropertyContent */
export interface BlockPropertyContent {
  property: string;
  type?: string;
  label?: BlockI18nText;
  description?: BlockI18nText;
  required?: boolean;
  defaultValue?: unknown;
  [key: string]: unknown;
}

/** 属性分组，对齐物料 bundle 的 IPropertyGroup */
export interface BlockPropertyGroup {
  name?: string;
  label?: BlockI18nText;
  description?: BlockI18nText;
  content?: BlockPropertyContent[];
  [key: string]: unknown;
}

/** 函数参数声明，对齐物料 bundle 的 IFunctionParam */
export interface BlockFunctionParam {
  name?: string;
  type?: string;
  description?: BlockI18nText;
  defaultValue?: unknown;
  [key: string]: unknown;
}

/** 函数签名声明，对齐物料 bundle 的 IFunctionInfo */
export interface BlockFunctionInfo {
  params?: BlockFunctionParam[];
  returns?: Record<string, unknown>;
  [key: string]: unknown;
}

/** 事件声明，对齐物料 bundle 的 IEventConfig；key 即使用方监听的属性名（如 onChange） */
export interface BlockEventConfig {
  label?: BlockI18nText;
  description?: BlockI18nText;
  type?: string;
  functionInfo?: BlockFunctionInfo;
  defaultValue?: unknown;
  [key: string]: unknown;
}

/** 插槽声明，对齐物料 bundle 的 ISlotConfig，扩展 params 声明插槽作用域参数 */
export interface BlockSlotConfig {
  label?: BlockI18nText;
  description?: BlockI18nText;
  /** 插槽内容可访问的作用域参数名，对应使用方 JSSlot 的 params */
  params?: string[];
  [key: string]: unknown;
}

/** 区块声明，对齐物料 bundle 的 IComponentSchema（properties / events / slots） */
export interface BlockConfigure {
  properties?: BlockPropertyGroup[];
  events?: Record<string, BlockEventConfig>;
  slots?: Record<string, BlockSlotConfig>;
  [key: string]: unknown;
}

/** 可复用的 UI 片段：声明与物料 bundle 中的组件定义一致，实现为一份 schema */
export interface BlockSchema extends Omit<RootNode, 'inputs' | 'outputs' | 'schema'> {
  componentName: string;
  /** 属性 / 事件 / 插槽声明，结构与物料 bundle 中的组件定义相同 */
  schema?: BlockConfigure;
}

/** key 为区块组件名 */
export type BlockRegistry = Record<string, BlockSchema>;
