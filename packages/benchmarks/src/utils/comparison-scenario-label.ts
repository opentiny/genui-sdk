import type { LlmBenchmarkResultItem } from '../framework/types';

/** 报告对比用场景标签：纯文本对照带「（纯文本）」后缀 */
export function comparisonScenarioLabel(
  r: Pick<LlmBenchmarkResultItem, 'scenario' | 'promptVariant'>,
): string {
  return (r.promptVariant ?? 'full') === 'plain' ? `${r.scenario}（纯文本）` : r.scenario;
}
