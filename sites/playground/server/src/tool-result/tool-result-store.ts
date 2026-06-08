export type ToolResultStore = Map<string, unknown>;

/**
 * 创建单次请求范围内的工具结果存储，用于 SSE 下发完整结果。
 *
 * @returns 以 toolCallId 为 key 的 Map
 */
export const createToolResultStore = (): ToolResultStore => new Map();

/**
 * 写入工具完整结果。
 *
 * @param store - 请求级工具结果存储
 * @param toolCallId - tool call id
 * @param result - 工具完整返回值
 */
export const storeToolResult = (
  store: ToolResultStore,
  toolCallId: string,
  result: unknown,
): void => {
  store.set(toolCallId, result);
};

/**
 * 读取工具完整结果。
 *
 * @param store - 请求级工具结果存储
 * @param toolCallId - tool call id
 * @returns 完整结果；未找到时返回 undefined
 */
export const getStoredToolResult = (
  store: ToolResultStore,
  toolCallId: string,
): unknown => store.get(toolCallId);
