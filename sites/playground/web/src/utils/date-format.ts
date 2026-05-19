/**
 * 格式化日期
 * @param date 日期（Date对象 | 时间戳 | 日期字符串）
 * @param format 格式模板，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的字符串
 *
 * 占位符说明：
 * YYYY - 四位年份
 * MM   - 两位月份（01-12）
 * DD   - 两位日期（01-31）
 * HH   - 两位小时（00-23）
 * mm   - 两位分钟（00-59）
 * ss   - 两位秒钟（00-59）
 * SSS  - 三位毫秒（000-999）
 */
export function formatDate(date: Date | number | string = new Date(), format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const d = new Date(date);

  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  const pad = (n: number, len = 2) => String(n).padStart(len, '0');

  const map: Record<string, string> = {
    YYYY: String(d.getFullYear()),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds()),
    SSS: pad(d.getMilliseconds(), 3),
  };

  return format.replace(/YYYY|MM|DD|HH|mm|ss|SSS/g, (token) => map[token]);
}
