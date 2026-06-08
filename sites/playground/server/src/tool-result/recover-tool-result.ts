import { getStoredToolResult, type ToolResultStore } from './tool-result-store.js';

interface ToolCallFunctionResult {
  id?: string;
  function?: { result?: unknown };
}

interface StreamDelta {
  tool_calls_result?: ToolCallFunctionResult[];
}

interface StreamChoice {
  delta?: StreamDelta;
}

interface StreamChunk {
  choices?: StreamChoice[];
}

/**
 * 判断值是否为包含 tool_calls_result 的流式 chunk。
 */
const isChunkWithToolResult = (chunk: Record<string, unknown>): chunk is Record<string, unknown> & StreamChunk => {
  if (!Array.isArray(chunk.choices) || chunk.choices.length === 0) {
    return false;
  }

  const delta = (chunk.choices as StreamChoice[])[0]?.delta;
  if (!delta || !Array.isArray(delta.tool_calls_result) || delta.tool_calls_result.length === 0) {
    return false;
  }

  return true;
};

/**
 * 将 SSE chunk 中 compact 的 tool 结果替换为完整结果，供客户端 Registry 与 UI 使用。
 *
 * @param chunk - OpenAI 兼容流式 chunk
 * @param store - 请求级工具结果存储
 */
export const recoverToolCallResult = (
  chunk: Record<string, unknown>,
  store: ToolResultStore,
): void => {
  if (!isChunkWithToolResult(chunk)) {
    return;
  }

  const toolResult = (chunk.choices as StreamChoice[])[0].delta!.tool_calls_result![0];
  const toolCallId = toolResult?.id;

  if (!toolCallId || !toolResult?.function) {
    return;
  }

  const stored = getStoredToolResult(store, toolCallId);
  if (stored === undefined) {
    return;
  }

  toolResult.function.result = stored;
};
