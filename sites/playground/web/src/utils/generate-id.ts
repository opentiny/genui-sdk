import { v4 as uuidv4 } from 'uuid';
/**
 * 通用 ID 生成函数
 *
 * @param length  截取长度，默认 16
 * @param prefix  可选前缀，如 'user_', 'order_'
 */
export function generateId(length: number = 16, prefix: string = ''): string {
  let id: string;
  let raw = '';
  while (raw.length < length) {
    raw += uuidv4().replace(/-/g, '');
  }
  id = raw.substring(0, length);

  return prefix + id;
}
