import { summarizeToolResult } from './summarize-tool-result.js';
import type { ToolResultEntry } from './types.js';

export type ToolResultRegistry = Map<string, ToolResultEntry>;

/**
 * 创建空的工具结果注册表。
 *
 * @returns 以 tool call id 为 key 的 Map
 */
export const createToolResultRegistry = (): ToolResultRegistry => new Map();

/**
 * 将单条工具调用结果写入注册表。
 *
 * @param registry - 工具结果注册表
 * @param entry - 不含 summary 的条目字段
 */
export const registerToolResult = (
  registry: ToolResultRegistry,
  entry: Omit<ToolResultEntry, 'summary'>,
): void => {
  registry.set(entry.id, {
    ...entry,
    summary: summarizeToolResult(entry.result),
  });
};

/**
 * 按 tool call id 查询工具结果。
 *
 * @param registry - 工具结果注册表
 * @param toolName - 工具名称，用于校验
 * @param id - tool call id
 * @returns 匹配的结果；未找到或 toolName 不一致时返回 null
 */
export const getToolResultFromRegistry = (
  registry: ToolResultRegistry,
  toolName: string,
  id: string,
): unknown | null => {
  const entry = registry.get(id);
  if (!entry || entry.toolName !== toolName) {
    return null;
  }

  return entry.result;
};

/**
 * 清空注册表。
 *
 * @param registry - 工具结果注册表
 */
export const clearToolResultRegistry = (registry: ToolResultRegistry): void => {
  registry.clear();
};

/**
 * 从会话消息历史重建工具结果注册表。
 *
 * @param registry - 工具结果注册表
 * @param messages - 当前会话的全部消息
 */
export const rebuildToolResultRegistryFromMessages = (
  registry: ToolResultRegistry,
  messages: Array<{ role?: string; messages?: Array<Record<string, unknown>> }>,
): void => {
  clearToolResultRegistry(registry);

  for (const message of messages) {
    if (message.role !== 'assistant' || !Array.isArray(message.messages)) {
      continue;
    }

    for (const item of message.messages) {
      if (item.type !== 'tool' || item.status !== 'success' || typeof item.id !== 'string') {
        continue;
      }

      try {
        const parsed = JSON.parse(String(item.content || '{}')) as { arguments?: unknown; result?: unknown };
        registerToolResult(registry, {
          id: item.id,
          toolName: String(item.name || ''),
          arguments: parsed.arguments,
          result: parsed.result,
        });
      } catch {
        // 跳过无法解析的历史 tool 项
      }
    }
  }
};
