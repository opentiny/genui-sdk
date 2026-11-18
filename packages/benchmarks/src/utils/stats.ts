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

export interface DistributionStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p90: number;
  p95: number;
  stdev?: number;
  coefficientOfVariation?: number;
}

function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return NaN;
  if (sorted.length === 1) return sorted[0]!;
  const pos = (sorted.length - 1) * p;
  const base = Math.floor(pos);
  const rest = pos - base;
  const lower = sorted[base]!;
  const upper = sorted[Math.min(base + 1, sorted.length - 1)]!;
  return lower + rest * (upper - lower);
}

/**
 * 常用分布统计；输入会过滤非有限数。
 */
export function distributionStats(values: readonly number[]): DistributionStats | undefined {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (sorted.length === 0) return undefined;
  const mean = arithmeticMean(sorted);
  const stdev = sampleStdev(sorted);
  return {
    count: sorted.length,
    min: sorted[0]!,
    max: sorted[sorted.length - 1]!,
    mean,
    median: percentile(sorted, 0.5),
    p90: percentile(sorted, 0.9),
    p95: percentile(sorted, 0.95),
    ...(stdev != null ? { stdev } : {}),
    ...(stdev != null && mean !== 0 ? { coefficientOfVariation: stdev / mean } : {}),
  };
}
