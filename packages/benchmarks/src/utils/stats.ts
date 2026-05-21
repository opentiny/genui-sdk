/**
 * 算术均值。
 */
export function arithmeticMean(values: readonly number[]): number {
  if (values.length === 0) return NaN;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * 样本标准差（贝塞尔校正，除以 n-1）；n 小于 2 时无定义。
 */
export function sampleStdev(values: readonly number[]): number | undefined {
  const n = values.length;
  if (n < 2) return undefined;
  const mean = arithmeticMean(values);
  const variance = values.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1);
  return Math.sqrt(variance);
}
