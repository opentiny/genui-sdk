/**
 * attribute / 模板绑定都会经过 transform：
 * - attribute 给的是字符串，解析成对象
 * - 模板绑定给的是对象，原样返回
 *
 * 注意：Angular 不允许 `@Input({ transform })` 使用泛型函数，返回类型只能是宽类型。
 */
export function jsonAttribute(value: unknown): any {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return value;
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
