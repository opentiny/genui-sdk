import type { BenchmarkExcelDetailRow, LlmBenchmarkResultItem, LlmBenchmarkSample } from '../framework/types';

/**
 * 生成 Excel「明细」工作表行；`samples` 与 `results` 须同序（同一排序下的样本与报告项）。
 * 不含模型输出 / schemaJson 等大字段（见同目录 `report.json` 与样本 `*.json`）。
 */
export function buildBenchmarkExcelDetailRows(
  results: LlmBenchmarkResultItem[],
  samples?: LlmBenchmarkSample[],
): BenchmarkExcelDetailRow[] {
  return results.map((r, i) => {
    const sample = samples?.[i];
    return {
      model: r.model ?? '',
      scenario: r.scenario,
      runIndex: r.runIndex ?? 1,
      failureTag: r.failureTag ?? '',
      totalMs: r.totalMs,
      tpsMs: typeof r.tpotMs === 'number' ? r.tpotMs : '',
      promptTokens: r.promptTokens,
      completionTokens: r.completionTokens,
      totalTokens: r.totalTokens,
      llmJudgeScore: r.llmJudgeScore ?? '',
      llmJudgeReason: r.llmJudgeReason ?? '',
      llmJudgeError: r.llmJudgeError ?? '',
      llmJudgeInputTokens: r.llmJudgePromptTokens ?? '',
      llmJudgeOutputTokens: r.llmJudgeCompletionTokens ?? '',
      errorMessage: r.errorMessage ?? '',
      retryCount: r.retryCount ?? '',
      retryWaitMs: r.retryWaitMs ?? '',
      rateLimitQueueWaitMs: r.rateLimitQueueWaitMs ?? '',
      lastRetryReason: r.lastRetryReason ?? '',
      rateLimited: r.rateLimited ?? '',
      promptVariant: sample ? (sample.promptVariant ?? 'full') : (r.promptVariant ?? 'full'),
      generatedAt: sample?.generatedAt ?? '',
    };
  });
}
