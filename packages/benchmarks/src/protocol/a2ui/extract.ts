import { A2UI_CLOSE_TAG, A2UI_OPEN_TAG } from './prompt';

const OPEN_RE = /<a2ui-json>/i;
const CLOSE_RE = /<\/a2ui-json>/i;

/**
 * 从模型输出中提取首个 `<a2ui-json>...</a2ui-json>` 块正文。
 */
export function extractA2uiJsonBlock(content: string): string | null {
  if (!content) return null;
  const openMatch = OPEN_RE.exec(content);
  if (!openMatch || openMatch.index == null) return null;
  const afterOpen = content.slice(openMatch.index + openMatch[0].length);
  const closeMatch = CLOSE_RE.exec(afterOpen);
  if (!closeMatch || closeMatch.index == null) return null;
  const body = afterOpen.slice(0, closeMatch.index).trim();
  return body.length > 0 ? body : null;
}

/**
 * 提取失败时的可读诊断（对齐 GenUI `describeMissingSchemaJsonFence` 风格）。
 */
export function describeMissingA2uiJsonBlock(output: string): string {
  const trimmed = (output ?? '').trim();
  if (!trimmed) {
    return `missing ${A2UI_OPEN_TAG}: model output is empty`;
  }

  if (OPEN_RE.test(trimmed) && !CLOSE_RE.test(trimmed)) {
    return `${A2UI_OPEN_TAG} found but ${A2UI_CLOSE_TAG} is missing or unclosed`;
  }
  if (OPEN_RE.test(trimmed) && CLOSE_RE.test(trimmed)) {
    return `${A2UI_OPEN_TAG}…${A2UI_CLOSE_TAG} present but block body is empty`;
  }

  if (/```a2ui/i.test(trimmed) || /```json/i.test(trimmed)) {
    return `missing ${A2UI_OPEN_TAG}: found markdown fences; A2UI requires ${A2UI_OPEN_TAG} tags (not \`\`\` fences)`;
  }
  if (/schemaJson/i.test(trimmed) || /"componentName"\s*:/.test(trimmed)) {
    return `missing ${A2UI_OPEN_TAG}: output looks like GenUI schemaJson; use A2UI tags and message envelope`;
  }
  if (
    /"createSurface"\s*:/.test(trimmed) ||
    /"updateComponents"\s*:/.test(trimmed) ||
    /"updateDataModel"\s*:/.test(trimmed)
  ) {
    return `missing ${A2UI_OPEN_TAG}: output looks like raw A2UI JSON but is not wrapped in tags`;
  }

  return `missing ${A2UI_OPEN_TAG}…${A2UI_CLOSE_TAG} (chars=${trimmed.length})`;
}

/**
 * 流式「首个可观测 UI」近似：规范要求定义 `id: root` 后客户端才开始 progressive render。
 * （`createSurface` / 仅出现 `updateComponents` 键时尚无可见组件。）
 */
export function hasA2uiFirstObservableMessage(text: string): boolean {
  return /"id"\s*:\s*"root"/.test(text);
}
