export interface ToolResultSummary {
  type: 'array' | 'object';
  count?: number;
  fields?: string[];
  preview?: unknown[];
  _hasCompact?: boolean;
}

const getFields = (value: unknown): string[] | undefined => {
  if (Array.isArray(value)) {
    const firstObject = value.find((item) => item && typeof item === 'object' && !Array.isArray(item));
    return firstObject ? Object.keys(firstObject as Record<string, unknown>) : undefined;
  }

  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>);
  }

  return undefined;
};

/**
 * 生成工具结果的轻量摘要，供 LLM 感知数据结构。
 *
 * @param result - 工具原始返回值
 * @returns 结果摘要
 */
export const summarizeToolResult = (result: unknown): ToolResultSummary => {
  if (Array.isArray(result)) {
    return {
      type: 'array',
      count: result.length,
      fields: getFields(result),
      preview: result.slice(0, 1),
      _hasCompact: true,
    };
  }

  if (result && typeof result === 'object') {
    return {
      type: 'object',
      fields: getFields(result),
    };
  }

  return {
    type: 'object',
  };
};
