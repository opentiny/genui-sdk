const padStart = (value: number, length = 2) => String(value).padStart(length, '0');

/** JSFunction 类型：物料包内联实现的工具函数，格式化日期时间（支持 YYYY-MM-DD HH:mm:ss 等占位符） */
export function formatDate(date: Date | number | string, format = 'YYYY-MM-DD') {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  // 全局替换各占位符（先 YYYY 再其余，替换结果均为数字，不会引入新的占位符）
  return format
    .replace(/YYYY/g, String(d.getFullYear()))
    .replace(/MM/g, padStart(d.getMonth() + 1))
    .replace(/DD/g, padStart(d.getDate()))
    .replace(/HH/g, padStart(d.getHours()))
    .replace(/mm/g, padStart(d.getMinutes()))
    .replace(/ss/g, padStart(d.getSeconds()));
}

/** JSFunction 类型：物料包内联实现的工具函数，格式化金额（千分位 + 固定小数位） */
export function formatMoney(value: number | string, digits = 2) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    return '0';
  }
  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
