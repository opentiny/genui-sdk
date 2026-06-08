import { getToolResultFromRegistry, type ToolResultRegistry } from './tool-result-registry.js';
import type { GetToolResultParams } from './types.js';

/**
 * 创建 getToolResult 自定义 Action，从注册表按 toolName + id 读取工具结果。
 *
 * @param registry - 工具结果注册表
 * @returns Action 定义（含 execute，供 GenuiChat / GenuiRenderer 注册）
 */
export const createGetToolResultAction = (registry: ToolResultRegistry) => ({
  name: 'getToolResult',
  description: '根据 toolName 与 id 获取历史工具调用结果，用于 schema 渲染时按需取数',
  parameters: {
    type: 'object' as const,
    properties: {
      toolName: {
        type: 'string',
        description: '工具名称',
      },
      id: {
        type: 'string',
        description: '工具调用 id，来自 assistant 上下文中的引用',
      },
    },
    required: ['toolName', 'id'],
  },
  execute: (params: GetToolResultParams) => getToolResultFromRegistry(registry, params.toolName, params.id),
});

/**
 * 导出供 LLM prompt 使用的 Action 元数据（不含 execute）。
 *
 * @returns 可序列化到 metadata.tinygenui 的 Action 定义
 */
export const getToolResultActionMetadata = () => {
  const { execute: _execute, ...metadata } = createGetToolResultAction(new Map());
  return metadata;
};
