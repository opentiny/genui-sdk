import type { CardSchema } from '../protocols/schema';
import type { IMaterialsProtocol } from './materials-protocol';

export interface IExample {
  id?: string;
  name: string;
  description?: string;
  schema: CardSchema;
}

/** 页面可用的工具描述，typeSchema 为供 LLM 阅读的自定义 JSON Schema 字符串 */
export interface IUtilsMeta {
  name: string;
  description?: string;
  /** 自定义 JSON Schema 字符串，描述函数、类、参数、返回值及方法等代码调用信息 */
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
