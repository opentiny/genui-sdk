import type { CardSchema } from '../protocols/schema';
import type { IMaterialsProtocol } from './materials-protocol';

export interface IExample {
  id?: string;
  name: string;
  description?: string;
  schema: CardSchema;
}

/**
 * 页面可用的工具描述，用于向 LLM 说明 `this.utils.xxx` 的类型与完整用法。
 * typeSchema 采用 TS 类型字符串：天然支持任意类型（函数签名、类、对象、联合类型、泛型、递归嵌套），
 * 是 LLM 最熟悉的类型语言，LLM 无需额外学习成本；`usage` 补充具体调用示例。
 */
export interface IUtilsMeta {
  name: string;
  description?: string;
  /** TS 类型字符串，如函数签名 `(date: Date | number | string, format?: string) => string`、类声明、任意值类型 */
  typeSchema: string;
  /** 调用示例（JS 代码片段） */
  usage?: string;
}

export interface IMaterialsMeta {
  materials: IMaterialsProtocol[];
  examples: IExample[];
  whiteList: string[];
  wrapperComponent?: string;
  rules?: string[];
  /** 页面可用的工具函数说明，无需在 schema 中声明 utils，直接在 JSFunction / JSExpression 中通过 this.utils.xxx 使用 */
  utils?: IUtilsMeta[];
}
