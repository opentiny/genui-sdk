import { summarizeToolResult } from './summarize-tool-result.js';

/**
 * 判断单个值是否为 MCP CallToolResult 的 content 块结构。
 */
const isMcpContentBlock = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value) && 'type' in value);

/**
 * 判断是否为 MCP 工具返回的 content 数组（如 `[{ type: 'text', text: '...' }]`）。
 */
const isMcpContentResult = (result: unknown): result is unknown[] =>
  Array.isArray(result) && result.length > 0 && result.every(isMcpContentBlock);

/**
 * 解析 MCP content 块中的文本内容，尝试 JSON 解析。
 *
 * @param mcpResultItem - MCP content 块
 * @returns 解析后的业务数据
 */
const parseMCPToolCallResultContent = (mcpResultItem: { type?: string; text?: string }): unknown => {
  const content = mcpResultItem?.text ?? '';
  if (!content) {
    return content;
  }

  try {
    return JSON.parse(content);
  } catch {
    return content;
  }
};

/**
 * 解析工具调用结果：MCP content 先提取 text 再解析，其余原样返回。
 *
 * @param result - 工具原始返回值
 * @returns 统一解析后的数据
 */
const parseToolCallResult = (result: unknown): unknown => {
  if (isMcpContentResult(result)) {
    if (result.length === 1) {
      return parseMCPToolCallResultContent(result[0]);
    }

    return result
      .map(parseMCPToolCallResultContent)
      .reduce<Record<string, unknown>>((acc, item, index) => {
        acc[`result_${index + 1}`] = item;
        return acc;
      }, {});
  }

  return result;
};

/**
 * 递归将值中的数组字段替换为 ToolResultSummary 摘要。
 *
 * @param value - 待压缩的业务数据
 * @returns 压缩后的值及是否发生过压缩
 */
const compactValue = (value: unknown): { value: unknown; hasCompact: boolean } => {
  if (Array.isArray(value)) {
    return {
      value: summarizeToolResult(value),
      hasCompact: true,
    };
  }

  if (value && typeof value === 'object') {
    let hasCompact = false;
    const compacted: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const compactedNested = compactValue(nested);
      compacted[key] = compactedNested.value;
      hasCompact = hasCompact || compactedNested.hasCompact;
    }

    return { value: compacted, hasCompact };
  }

  return { value, hasCompact: false };
};

/**
 * 构建返回给 LLM 的工具结果包装对象：大数据量结构返回 compact 摘要，其余原样透传解析值。
 *
 * @param toolName - 工具名称
 * @param toolCallId - AI SDK 分配的 tool call id
 * @param result - 工具完整返回值
 * @returns fullResult 供存储，compactResult 供 LLM 消费
 */
export const createCompactToolCallResult = (
  toolName: string,
  toolCallId: string,
  result: unknown,
) => {
  const fullResult = parseToolCallResult(result);
  const { value: compactResultValue, hasCompact } = compactValue(fullResult);

  const compactToolCallResult = {
    toolName,
    id: toolCallId,
    result: compactResultValue,
    tip: `上下文中有本次工具调用的完整结果；如需使用完整数据，请通过 this.callAction("getToolResult", { toolName: "${toolName}", id: "${toolCallId}" }) 获取；`,
  };
  if (hasCompact) {
    compactToolCallResult.tip += `部分数组字段因数据量过大已压缩为摘要，仅展示数据结构与概要。_hasCompact为true，说明数组字段已压缩。实际使用时，请当其为普通数组使用而不是对象`;
  }

  return {
    fullResult,
    compactResult: compactToolCallResult,
  };
};
