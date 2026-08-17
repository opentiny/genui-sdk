import { A2UI_CLOSE_TAG, A2UI_OPEN_TAG } from './prompt';

const OPEN_RE = /<a2ui-json>/i;
const CLOSE_RE = /<\/a2ui-json>/i;

export type ExtractA2uiJsonBlocksResult = {
  /** 已完整闭合的块正文（trim 后；可能为空串） */
  blocks: string[];
  /** 在最后一个完整块之后仍有未闭合的 open tag */
  unclosed: boolean;
};

/**
 * 提取输出中全部完整的 `<a2ui-json>...</a2ui-json>` 块（协议允许一块或多块）。
 */
export function extractAllA2uiJsonBlocks(content: string): ExtractA2uiJsonBlocksResult {
  const blocks: string[] = [];
  if (!content) return { blocks, unclosed: false };

  let searchFrom = 0;
  while (searchFrom < content.length) {
    const slice = content.slice(searchFrom);
    const openMatch = OPEN_RE.exec(slice);
    if (!openMatch || openMatch.index == null) {
      return { blocks, unclosed: false };
    }
    const openAbs = searchFrom + openMatch.index;
    const afterOpen = content.slice(openAbs + openMatch[0].length);
    const closeMatch = CLOSE_RE.exec(afterOpen);
    if (!closeMatch || closeMatch.index == null) {
      return { blocks, unclosed: true };
    }
    blocks.push(afterOpen.slice(0, closeMatch.index).trim());
    searchFrom = openAbs + openMatch[0].length + closeMatch.index + closeMatch[0].length;
  }
  return { blocks, unclosed: false };
}

/**
 * 提取首个完整 `<a2ui-json>` 块正文；无完整块时返回 null。
 * @deprecated 新逻辑请用 {@link extractAllA2uiJsonBlocks}；保留给调试/兼容。
 */
export function extractA2uiJsonBlock(content: string): string | null {
  const { blocks } = extractAllA2uiJsonBlocks(content);
  if (blocks.length === 0) return null;
  const first = blocks[0]!;
  return first.length > 0 ? first : null;
}

/**
 * 提取失败时的可读诊断（对齐 GenUI `describeMissingSchemaJsonFence` 风格）。
 */
export function describeMissingA2uiJsonBlock(output: string): string {
  const trimmed = (output ?? '').trim();
  if (!trimmed) {
    return `missing ${A2UI_OPEN_TAG}: model output is empty`;
  }

  const { blocks, unclosed } = extractAllA2uiJsonBlocks(trimmed);
  if (unclosed) {
    return `${A2UI_OPEN_TAG} found but ${A2UI_CLOSE_TAG} is missing or unclosed` +
      (blocks.length ? ` (after ${blocks.length} complete block(s))` : '');
  }
  if (blocks.length > 0 && blocks.every((b) => b.length === 0)) {
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
    /"updateDataModel"\s*:/.test(trimmed) ||
    /"deleteSurface"\s*:/.test(trimmed)
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
