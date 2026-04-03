import type { LlmBenchmarkResultItem } from './types';
import { formatNumber } from '../utils';

/**
 * 输出每个场景的详细指标表格。
 * @param results 单次运行结果明细
 */
export function printBenchmarkTable(results: LlmBenchmarkResultItem[]) {
  console.table(
    results.map((item) => ({
      scenario: item.scenario,
      model: item.model ?? '',
      runIndex: item.runIndex ?? 1,
      ttftMs: formatNumber(item.ttftMs, 2),
      totalMs: formatNumber(item.totalMs, 2),
      tpotMsPerTok: item.tpotMs == null ? '' : formatNumber(item.tpotMs, 2),
      schemaBlock: item.isSchemaJsonBlockFound,
      validJson: item.isSchemaJsonValidJson,
      validSchema: item.isSchemaJsonValidAgainstProtocol,
      schemaError: item.schemaValidationError ?? '',
      promptTokens: item.promptTokens,
      completionTokens: item.completionTokens,
      totalTokens: item.totalTokens,
      outputChars: item.rawOutputChars,
      judgeScore: item.llmJudgeScore == null ? '' : formatNumber(item.llmJudgeScore, 2),
      judgeReason: item.llmJudgeReason ?? '',
      judgeError: item.llmJudgeError ?? '',
      error: item.errorMessage || '',
    })),
  );
}

/**
 * 输出聚合汇总指标（成功率、平均延迟、总 token）。
 * @param results 单次运行结果明细
 */
export function printBenchmarkSummary(results: LlmBenchmarkResultItem[]) {
  const successCount = results.filter((item) => item.isSchemaJsonValidAgainstProtocol).length;
  const avgTtft = results.reduce((sum, item) => sum + item.ttftMs, 0) / results.length;
  const avgTotal = results.reduce((sum, item) => sum + item.totalMs, 0) / results.length;
  const tpotDefined = results.filter((item) => typeof item.tpotMs === 'number');
  const avgTpot =
    tpotDefined.length > 0 ? tpotDefined.reduce((sum, item) => sum + (item.tpotMs as number), 0) / tpotDefined.length : null;
  const totalTokens = results.reduce((sum, item) => sum + item.totalTokens, 0);
  const uniqueScenarioCount = new Set(results.map((item) => item.scenario)).size;
  const uniqueModelCount = new Set(results.map((item) => item.model).filter(Boolean)).size;
  const judgeScores = results.map((item) => item.llmJudgeScore).filter((score): score is number => typeof score === 'number');
  const avgJudgeScore = judgeScores.length > 0 ? judgeScores.reduce((sum, score) => sum + score, 0) / judgeScores.length : null;
  const summary = [
    {
      scenarios: uniqueScenarioCount,
      models: uniqueModelCount,
      runs: results.length,
      validSchema: `${successCount}/${results.length}`,
      avgJudgeScore: avgJudgeScore == null ? 'N/A' : formatNumber(avgJudgeScore, 2),
      avgTtftMs: formatNumber(avgTtft, 2),
      avgTotalMs: formatNumber(avgTotal, 2),
      avgTpotMsPerTok: avgTpot == null ? 'N/A' : formatNumber(avgTpot, 2),
      totalTokens,
    },
  ];

  console.log('\nBenchmark Summary');
  console.table(summary);
}

/**
 * 以 JSON 结构输出全部结果，便于后续自动化处理。
 * @param results 单次运行结果明细
 */
export function printBenchmarkJson(results: LlmBenchmarkResultItem[]) {
  console.log(JSON.stringify(results, null, 2));
}
