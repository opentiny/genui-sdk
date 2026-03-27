/**
 * 统一处理数值显示精度，避免输出过长小数。
 * @param value 原始数值
 * @param fractionDigits 保留小数位数（默认 2）
 * @returns 四舍五入后的数值
 */
export function formatNumber(value: number, fractionDigits = 2) {
  return Number(value.toFixed(fractionDigits));
}
