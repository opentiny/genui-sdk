/**
 * 基类 CodeGeneratorBase 里那几个纯函数（不碰实例状态）。
 * 拆出来的各层不是它的子类，拿不到 protected 成员，所以由门面构造一份显式注入。
 */
export interface IBaseHelpers {
  /** 认 `function 名字(...) { ... }` 形式，取出 async 前缀、形参与函数体 */
  getFunctionInfo(fnStr: string): { type: string; params: string[]; body: string } | null;
  /** 去掉字符串与注释：其中的关键字、箭头、花括号都不算代码 */
  stripLiterals(source: string): string;
  /** 与已有名字查重后加序号后缀 */
  avoidDuplicateString(existings: string[], baseName: string): string;
  /** 生成物里的 `this.x` 要落成模板里的 `x` */
  replaceThis(value: string): string;
  /** 值是不是 JSExpression / JSFunction / JSSlot 协议对象 */
  resolvePropValueType(value: unknown): string;
  /** 事件键是不是 onXxx 形式 */
  isOnEventKey(key: string): boolean;
}
