import type { LlmBenchmarkResultItem } from './types';
import { comparisonScenarioLabel, countsTowardProtocolGate, formatNumber, isPlainPromptVariant } from '../utils';

function toDisplayNumber(value: number | undefined) {
  return typeof value === 'number' ? formatNumber(value, 2) : '';
}

function averageDefined(values: Array<number | undefined>) {
  const defined = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (defined.length === 0) return null;
  return defined.reduce((sum, value) => sum + value, 0) / defined.length;
}

/**
 * 输出每个场景的详细指标表格。
 * @param results 单次运行结果明细
 */
export function printBenchmarkTable(results: LlmBenchmarkResultItem[]) {
  console.table(
    results.map((item) => ({
      scenario: item.scenario,
      promptVariant: item.promptVariant ?? 'full',
      model: item.model ?? '',
      runIndex: item.runIndex ?? 1,
      ttftMs: toDisplayNumber(item.ttftMs),
      tinyCardMs: toDisplayNumber(item.firstObservableComponentMs),
      totalMs: formatNumber(item.totalMs, 2),
      tpotMsPerTok: item.tpotMs == null ? '' : formatNumber(item.tpotMs, 2),
      validSchema: isPlainPromptVariant(item) ? 'skipped' : item.isSchemaJsonValidAgainstProtocol,
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
  if (results.length === 0) {
    console.log('\nBenchmark Summary');
    console.log('No result rows to summarize (empty input, all runs failed, or filters excluded every row).');
    console.table([
      {
        scenarios: 0,
        models: 0,
        runs: 0,
        validSchema: 'N/A',
        avgJudgeScore: 'N/A',
        avgTtftMs: 'N/A',
        avgTinyCardMs: 'N/A',
        avgTotalMs: 'N/A',
        avgTpotMsPerTok: 'N/A',
        totalTokens: 'N/A',
      },
    ]);
    return;
  }

  const protocolRows = results.filter(countsTowardProtocolGate);
  const successful = results.filter((item) => item.requestFailed !== true);
  const successCount = protocolRows.filter((item) => item.isSchemaJsonValidAgainstProtocol).length;
  const avgTtft = averageDefined(successful.map((item) => item.ttftMs));
  const avgFirstObs = averageDefined(successful.map((item) => item.firstObservableComponentMs));
  const avgTotal = averageDefined(successful.map((item) => item.totalMs));
  const tpotDefined = successful.filter((item) => typeof item.tpotMs === 'number');
  const avgTpot =
    tpotDefined.length > 0 ? tpotDefined.reduce((sum, item) => sum + (item.tpotMs as number), 0) / tpotDefined.length : null;
  const totalTokens = successful.length > 0 ? successful.reduce((sum, item) => sum + item.totalTokens, 0) : null;
  const uniqueScenarioCount = new Set(results.map((item) => comparisonScenarioLabel(item))).size;
  const uniqueModelCount = new Set(results.map((item) => item.model).filter(Boolean)).size;
  const judgeScores = results.map((item) => item.llmJudgeScore).filter((score): score is number => typeof score === 'number');
  const avgJudgeScore = judgeScores.length > 0 ? judgeScores.reduce((sum, score) => sum + score, 0) / judgeScores.length : null;
  const summary = [
    {
      scenarios: uniqueScenarioCount,
      models: uniqueModelCount,
      runs: results.length,
      validSchema:
        protocolRows.length === 0 ? 'N/A (plain)' : `${successCount}/${protocolRows.length}`,
      avgJudgeScore: avgJudgeScore == null ? 'N/A' : formatNumber(avgJudgeScore, 2),
      avgTtftMs: avgTtft == null ? 'N/A' : formatNumber(avgTtft, 2),
      avgTinyCardMs: avgFirstObs == null ? 'N/A' : formatNumber(avgFirstObs, 2),
      avgTotalMs: avgTotal == null ? 'N/A' : formatNumber(avgTotal, 2),
      avgTpotMsPerTok: avgTpot == null ? 'N/A' : formatNumber(avgTpot, 2),
      totalTokens: totalTokens ?? 'N/A',
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
