import type { LlmBenchmarkResultItem } from '../framework/types';

/** 空 system 纯文本对照样本（`promptVariant=plain`） */
export function isPlainPromptVariant(
  r: Pick<LlmBenchmarkResultItem, 'promptVariant'> | { promptVariant?: string },
): boolean {
  return (r.promptVariant ?? 'full') === 'plain';
}

/**
 * 是否计入协议合规门禁 / schemaPassRate。
 * plain 无协议约束，与 Judge 一样跳过。
 */
export function countsTowardProtocolGate(
  r: Pick<LlmBenchmarkResultItem, 'promptVariant' | 'requestFailed'> | { promptVariant?: string; requestFailed?: boolean },
): boolean {
  return !isPlainPromptVariant(r) && r.requestFailed !== true;
}

/** 报告对比用场景标签：纯文本对照带「（纯文本）」后缀 */
export function comparisonScenarioLabel(
  r: Pick<LlmBenchmarkResultItem, 'scenario' | 'promptVariant'>,
): string {
  return isPlainPromptVariant(r) ? `${r.scenario}（纯文本）` : r.scenario;
}
