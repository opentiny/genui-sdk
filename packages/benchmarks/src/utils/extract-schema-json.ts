import { PatternExtractor } from '@opentiny/genui-sdk-core';

/**
 * 用 core `PatternExtractor`（默认 `SchemaJsonPattern`）从完整输出中提取 schemaJson 段。
 * 与 SDK 流式拆分路径一致，避免手写正则与主包分叉。
 */
export function extractSchemaJsonBlock(content: string): string | null {
  if (!content) return null;
  let handled = '';
  let firstBlockDone = false;
  const extractor = new PatternExtractor({
    onNormalWrite() {
      if (handled.length > 0) firstBlockDone = true;
    },
    onHandledWrite(chunk) {
      if (!firstBlockDone) handled += chunk;
    },
  });
  extractor.handleContent(content);
  const text = handled.trim();
  return text.length > 0 ? text : null;
}

/**
 * 当提取失败时给出可操作的原因（与 core 严格匹配的 ` ```schemaJson ` 围栏对齐）。
 */
export function describeMissingSchemaJsonFence(output: string): string {
  const trimmed = (output ?? '').trim();
  if (!trimmed) {
    return 'missing ```schemaJson fence: model output is empty';
  }

  const fenceOpens = [...trimmed.matchAll(/```([^\n`]*)/g)];
  const fenceTags = fenceOpens.map((m) => (m[1] ?? '').trim()).filter((tag) => tag.length > 0);
  const uniqueTags = [...new Set(fenceTags)];
  const unlabeledCount = fenceOpens.length - fenceTags.length;

  if (fenceOpens.length === 0) {
    if (/^\s*\{/.test(trimmed) && /"componentName"\s*:/.test(trimmed)) {
      return 'missing ```schemaJson fence: output looks like raw JSON (has componentName) but is not wrapped';
    }
    if (/schemaJson/i.test(trimmed)) {
      return 'missing ```schemaJson fence: output mentions schemaJson but has no markdown code fence';
    }
    return `missing \`\`\`schemaJson fence: no markdown code fences in output (chars=${trimmed.length})`;
  }

  if (uniqueTags.some((t) => t === 'schemaJson')) {
    // 有开标签但 PatternExtractor 未抽出内容：常见于未闭合或块内为空
    return '```schemaJson fence found but block body is empty or unclosed (PatternExtractor extracted nothing)';
  }

  const similar = uniqueTags.filter((t) => /schema\s*json/i.test(t) || /^json$/i.test(t));
  if (similar.some((t) => /^json$/i.test(t))) {
    return `missing \`\`\`schemaJson fence: found \`\`\`json instead (SDK requires language tag schemaJson). fences=[${uniqueTags.join(', ')}]`;
  }
  if (similar.length > 0) {
    return `missing \`\`\`schemaJson fence: similar tag(s) [${similar.join(', ')}] but not exact schemaJson. fences=[${uniqueTags.join(', ')}]`;
  }
  if (uniqueTags.length === 0 && unlabeledCount > 0) {
    return `missing \`\`\`schemaJson fence: found ${unlabeledCount} unlabeled code fence(s); need language tag schemaJson`;
  }

  const preview = uniqueTags.slice(0, 8).join(', ');
  const more = uniqueTags.length > 8 ? `, +${uniqueTags.length - 8}` : '';
  const unlabeledHint = unlabeledCount > 0 ? `; plus ${unlabeledCount} unlabeled` : '';
  return `missing \`\`\`schemaJson fence: code fences present but none tagged schemaJson. fences=[${preview}${more}]${unlabeledHint}`;
}
