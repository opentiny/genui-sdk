import type { LlmBenchmarkResultItem } from './types';

/**
 * 统一处理数值显示精度，避免输出过长小数。
 */
function formatNumber(value: number, fractionDigits = 2) {
  return Number(value.toFixed(fractionDigits));
}

/**
 * 输出每个场景的详细指标表格。
 */
export function printBenchmarkTable(results: LlmBenchmarkResultItem[]) {
  console.table(
    results.map((item) => ({
      scenario: item.scenario,
      ttftMs: formatNumber(item.ttftMs, 2),
      totalMs: formatNumber(item.totalMs, 2),
      schemaBlock: item.isSchemaJsonBlockFound,
      validJson: item.isSchemaJsonValidJson,
      validSchema: item.isSchemaJsonValidAgainstProtocol,
      promptTokens: item.promptTokens,
      completionTokens: item.completionTokens,
      totalTokens: item.totalTokens,
      outputChars: item.rawOutputChars,
      error: item.errorMessage || '',
    })),
  );
}

/**
 * 输出聚合汇总指标（成功率、平均延迟、总 token）。
 */
export function printBenchmarkSummary(results: LlmBenchmarkResultItem[]) {
  const successCount = results.filter((item) => item.isSchemaJsonValidAgainstProtocol).length;
  const avgTtft = results.reduce((sum, item) => sum + item.ttftMs, 0) / results.length;
  const avgTotal = results.reduce((sum, item) => sum + item.totalMs, 0) / results.length;
  const totalTokens = results.reduce((sum, item) => sum + item.totalTokens, 0);
  const summary = [
    {
      scenarios: results.length,
      validSchema: `${successCount}/${results.length}`,
      avgTtftMs: formatNumber(avgTtft, 2),
      avgTotalMs: formatNumber(avgTotal, 2),
      totalTokens,
    },
  ];

  console.log('\nBenchmark Summary');
  console.table(summary);
}

/**
 * 以 JSON 结构输出全部结果，便于后续自动化处理。
 */
export function printBenchmarkJson(results: LlmBenchmarkResultItem[]) {
  console.log(JSON.stringify(results, null, 2));
}
