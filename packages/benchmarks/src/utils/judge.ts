/**
 * 从 Judge 输出中提取 JSON 对象。
 * @param text Judge 模型原始文本
 * @returns 结构化对象；失败时返回 null
 */
export function parseJudgeJson(text: string): { score?: number; reason?: string } | null {
  const blockMatch = text.match(/```json\s*([\s\S]*?)```/i);
  const raw = (blockMatch?.[1] ?? text).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as { score?: unknown; reason?: unknown };
    return {
      score: typeof parsed.score === 'number' ? parsed.score : undefined,
      reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
    };
  } catch {
    return null;
  }
}
