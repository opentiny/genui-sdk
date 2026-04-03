/**
 * TPOT（Time Per Output Token）：首 token 之后，每多生成一个输出 token 的平均耗时（ms / token）。
 * 使用 total 与 TTFT、completion token 数推导：(totalMs - ttftMs) / (completionTokens - 1)。
 * @returns 可计算时为非负有限数；completionTokens ≤ 1 或时间为负时返回 undefined
 */
export function computeTpotMs(ttftMs: number, totalMs: number, completionTokens: number): number | undefined {
  if (!Number.isFinite(ttftMs) || !Number.isFinite(totalMs) || !Number.isFinite(completionTokens)) {
    return undefined;
  }
  if (completionTokens <= 1) return undefined;
  const genMs = totalMs - ttftMs;
  if (genMs < 0) return undefined;
  return genMs / (completionTokens - 1);
}
