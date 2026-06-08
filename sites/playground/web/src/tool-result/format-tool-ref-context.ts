import type { ToolResultSummary } from './types.js';

/**
 * 生成写入 assistant.content 的工具结果引用字符串，供 LLM 感知可用数据。
 *
 * @param toolName - 工具名称
 * @param id - tool call id
 * @param summary - 结果摘要
 * @returns 引用说明文本
 */
export const formatToolRefContext = (toolName: string, id: string, summary: ToolResultSummary): string => {
  const summaryText = JSON.stringify(summary);

  return (
    `工具调用完成：toolName=${toolName}，id=${id}，summary=${summaryText}\n` +
    `可以通过 this.callAction('getToolResult', { toolName: '${toolName}', id: '${id}' }) 获取数据。\n\n`
  );
};
