import { PatternExtractor } from '@opentiny/genui-sdk-core';

/**
 * 用 core `PatternExtractor`（默认 `SchemaJsonPattern`）从完整输出中提取 schemaJson 段。
 * 与 SDK 流式拆分路径一致，避免手写正则与主包分叉。
 */
export function extractSchemaJsonBlock(content: string): string | null {
  if (!content) return null;
  let handled = '';
  const extractor = new PatternExtractor({
    onNormalWrite() {},
    onHandledWrite(chunk) {
      handled += chunk;
    },
  });
  extractor.handleContent(content);
  const text = handled.trim();
  return text.length > 0 ? text : null;
}
