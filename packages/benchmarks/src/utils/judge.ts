export type JudgeParseFailureCode =
  | 'empty'
  | 'non_json'
  | 'invalid_json'
  | 'missing_score'
  | 'invalid_score';

export type ParseJudgeJsonResult =
  | { ok: true; score: number; reason?: string }
  | { ok: false; code: JudgeParseFailureCode; preview?: string };

function truncatePreview(text: string, max = 120): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max)}…`;
}

/**
 * 从 Judge 输出中提取 JSON 对象，失败时返回可区分的错误码。
 */
export function parseJudgeJson(text: string): ParseJudgeJsonResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, code: 'empty' };
  }

  const blockMatch = trimmed.match(/```json\s*([\s\S]*?)```/i);
  const raw = (blockMatch?.[1] ?? trimmed).trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    return { ok: false, code: 'non_json', preview: truncatePreview(trimmed) };
  }

  let parsed: { score?: unknown; reason?: unknown };
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as { score?: unknown; reason?: unknown };
  } catch {
    return { ok: false, code: 'invalid_json', preview: truncatePreview(raw.slice(start, end + 1)) };
  }

  if (parsed.score === undefined || parsed.score === null) {
    return { ok: false, code: 'missing_score', preview: truncatePreview(JSON.stringify(parsed)) };
  }
  if (
    typeof parsed.score !== 'number' ||
    !Number.isFinite(parsed.score) ||
    parsed.score < 1 ||
    parsed.score > 10
  ) {
    return {
      ok: false,
      code: 'invalid_score',
      preview: truncatePreview(`score=${String(parsed.score)}`),
    };
  }

  return {
    ok: true,
    score: parsed.score,
    reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
  };
}

export function isJudgeTimeoutError(error: unknown): boolean {
  if (error == null) return false;
  if (typeof error === 'object') {
    const name = (error as { name?: string }).name;
    if (name === 'TimeoutError' || name === 'AbortError') return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  return (
    lower.includes('timeout') ||
    lower.includes('timed out') ||
    lower.includes('aborted') ||
    lower.includes('abort') ||
    lower.includes('deadline')
  );
}

export function formatJudgeParseError(result: Extract<ParseJudgeJsonResult, { ok: false }>): string {
  switch (result.code) {
    case 'empty':
      return 'judge_empty_output';
    case 'non_json':
      return result.preview ? `judge_non_json: ${result.preview}` : 'judge_non_json';
    case 'invalid_json':
      return result.preview ? `judge_invalid_json: ${result.preview}` : 'judge_invalid_json';
    case 'missing_score':
      return result.preview ? `judge_missing_score: ${result.preview}` : 'judge_missing_score';
    case 'invalid_score':
      return result.preview ? `judge_invalid_score: ${result.preview}` : 'judge_invalid_score';
  }
}
