import { reactive, toRaw } from 'vue';
import type { IMessageItem, IStreamData } from '@opentiny/genui-sdk-core';
import { formatToolRefContext } from './format-tool-ref-context.js';
import { registerToolResult, type ToolResultRegistry } from './tool-result-registry.js';
import { summarizeToolResult } from './summarize-tool-result.js';

export interface ToolStreamChatMessage {
  role: string;
  content: string;
  messages: IMessageItem[];
}

export interface ToolStreamContext {
  toolCallIdMap: Record<string, IMessageItem & { type: 'tool' }>;
  toolCallStatus: { inProcessToolCallId: string | null };
  chatMessage: ToolStreamChatMessage;
}

/**
 * 深拷贝对象，供通知事件使用。
 *
 * @param obj - 待拷贝对象
 * @returns 拷贝结果
 */
const deepClone = (obj: unknown): unknown => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  try {
    return structuredClone(obj);
  } catch {
    return JSON.parse(JSON.stringify(obj));
  }
};

/**
 * 处理 tool_calls 流式增量，创建或更新 tool 消息项。
 *
 * @param toolCalls - SSE delta 中的 tool_calls
 * @param context - 流式上下文
 * @param onNotify - 可选通知回调
 */
export const handleToolCallsDelta = (
  toolCalls: Array<{ id?: string; function: { name?: string; arguments?: string } }>,
  context: ToolStreamContext,
  onNotify?: (payload: Record<string, unknown>) => void,
): void => {
  toolCalls.forEach((toolCall) => {
    const {
      id,
      function: { name, arguments: argsDelta },
    } = toolCall;

    let toolCallItem: IMessageItem & { type: 'tool' };

    if (id) {
      context.toolCallStatus.inProcessToolCallId = id;
      toolCallItem = reactive({
        type: 'tool',
        name: name || '',
        formatPretty: true,
        status: 'running',
        content: JSON.stringify({ arguments: argsDelta || '' }, null, 2),
        id,
      }) as IMessageItem & { type: 'tool' };
      context.toolCallIdMap[id] = toolCallItem;
      context.chatMessage.messages.push(toolCallItem);
    } else {
      const currentId = context.toolCallStatus.inProcessToolCallId;
      if (!currentId) {
        return;
      }
      toolCallItem = context.toolCallIdMap[currentId];
      if (!toolCallItem) {
        return;
      }

      let prevArgs = '';
      try {
        prevArgs = JSON.parse(toolCallItem.content).arguments;
      } catch {
        // content 可能因流式异常而无法解析，回退为空字符串
      }
      const nextArgs = prevArgs + (argsDelta || '');
      toolCallItem.content = JSON.stringify({ arguments: nextArgs }, null, 2);
    }

    onNotify?.({
      type: 'tool',
      toolCallData: toolCallItem,
      chatMessage: deepClone(toRaw(context.chatMessage)),
    });
  });
};

/**
 * 处理 tool_calls_result 流式增量：更新 UI、写入注册表、追加引用到 content。
 *
 * @param toolCallsResult - SSE delta 中的 tool_calls_result
 * @param registry - 工具结果注册表
 * @param context - 流式上下文
 * @param onNotify - 可选通知回调
 */
export const handleToolResultDelta = (
  toolCallsResult: Array<{ id: string; function: { arguments?: unknown; result?: unknown } }>,
  registry: ToolResultRegistry,
  context: ToolStreamContext,
  onNotify?: (payload: Record<string, unknown>) => void,
): void => {
  if (!toolCallsResult?.length) {
    return;
  }

  const {
    id,
    function: { arguments: args, result },
  } = toolCallsResult[0];
  const toolCallItem = context.toolCallIdMap[id];

  if (!toolCallItem) {
    return;
  }

  toolCallItem.status = 'success';
  toolCallItem.content = JSON.stringify({ arguments: args, result }, null, 2);

  registerToolResult(registry, {
    id,
    toolName: toolCallItem.name,
    arguments: args,
    result,
  });

  const summary = summarizeToolResult(result);
  context.chatMessage.content += formatToolRefContext(toolCallItem.name, id, summary);

  onNotify?.({
    type: 'tool',
    toolCallData: deepClone(toRaw(toolCallItem)),
    chatMessage: deepClone(toRaw(context.chatMessage)),
  });
};

/**
 * 创建 Playground 专用 toolResult response handler，替代 SDK 默认实现。
 *
 * @param registry - 工具结果注册表
 * @param onNotify - 可选通知回调（主聊天传 emitter，模板传 template emitter）
 * @returns response handler 配置
 */
export const createPlaygroundToolResultHandler = (
  registry: ToolResultRegistry,
  onNotify?: (payload: Record<string, unknown>) => void,
) => ({
  name: 'toolResult',
  match: (data: IStreamData) => {
    const delta = data.choices?.[0]?.delta ?? {};
    return Boolean(delta.tool_calls_result?.length);
  },
  handler: (data: IStreamData, context: ToolStreamContext & Record<string, unknown>) => {
    const delta = data.choices?.[0]?.delta ?? {};
    handleToolResultDelta(delta.tool_calls_result, registry, context, onNotify);
    return true;
  },
});

/**
 * 创建 Playground 专用 toolCall response handler（与 SDK 默认逻辑一致，便于模板复用）。
 *
 * @param onNotify - 可选通知回调
 * @returns response handler 配置
 */
export const createPlaygroundToolCallHandler = (onNotify?: (payload: Record<string, unknown>) => void) => ({
  name: 'toolCall',
  match: (data: IStreamData) => {
    const delta = data.choices?.[0]?.delta ?? {};
    return Boolean(delta.tool_calls?.length);
  },
  handler: (data: IStreamData, context: ToolStreamContext & Record<string, unknown>) => {
    const delta = data.choices?.[0]?.delta ?? {};
    handleToolCallsDelta(delta.tool_calls, context, onNotify);
    return true;
  },
  start: (context: ToolStreamContext & Record<string, unknown>) => {
    context.toolCallIdMap = {};
    context.toolCallStatus = { inProcessToolCallId: null };
  },
});
