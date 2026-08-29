import type { ICodegenDescription } from '../types';

/**
 * 组件库 prop 特判适配器上下文。
 * 参数与 AngularCodeGeneratorBase.processLibrarySpecificProp 对齐,
 * 并注入两个工具函数,让适配器与基类方法解耦、可独立测试。
 */
export interface IAngularPropContext {
  componentName: string;
  key: string;
  rawItem: unknown;
  props: Record<string, unknown>;
  attrsArr: string[];
  description: ICodegenDescription;
  state: Record<string, unknown>;
  schemaMethods?: Record<string, { value: string }>;
  /** 解析 prop 类型(JSExpression / JSFunction / JSSlot / literal) */
  resolvePropValueType: (value: unknown) => string;
  /** 模板表达式清理:this.x / this.props.x → x */
  cleanThisInTemplate: (value: string) => string;
}

/**
 * 组件库单个 prop 特判适配器。
 * 每个特判一个小类:命中后生成绑定并消费该 prop,
 * 避免在生成器类的 processLibrarySpecificProp 里堆长 if-链。
 * 不同组件库各自实现一组适配器,经 IAngularLibraryConfig.propAdapters 注入。
 */
export abstract class AngularPropAdapter {
  abstract readonly name: string;

  /** 返回 true 表示该 prop 已被本适配器处理,调用方不再走通用绑定逻辑 */
  abstract tryHandle(ctx: IAngularPropContext): boolean;
}
