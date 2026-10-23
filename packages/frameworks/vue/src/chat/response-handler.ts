import {
  IChatMessage,
  ICompleteData,
  IMessageItem,
  IStreamDelta,
  IStreamData,
  PatternExtractor,
} from '@opentiny/genui-sdk-core';
import { ThinkTagWrapPattern } from './think-tag-wrap-pattern';
import { reactive, readonly, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { emitter } from './event-emitter';
import { useI18n } from './i18n';

export interface IResponseHandler<T> {
  name: string;
  match: (data: T, context: any) => boolean;
  handler: (data: T, context: any) => boolean;
  notMatchHandler?: (data: T, context: any) => boolean;
  beforeRequest?: (context: any) => void;
  onRequestError?: (context: any, error?: unknown) => void;
  start?: (
    context: any,
    handlers: { onData: (data: IChatMessage) => void; onDone: () => void; onError: (error: Error) => void },
  ) => void;
  end?: (context: any) => void;
  complete?: (data: ICompleteData, context: any) => void;
}

/** OpenAI chat.completion 的线上形状（非流式） */
export interface ICompleteResponseJson {
  id?: string;
  object?: string;
  model?: string;
  created?: number;
  choices?: {
    index?: number;
    message?: {
      content?: string;
      reasoning_content?: string;
      tool_calls?: IStreamDelta['tool_calls'];
      tool_calls_result?: IStreamDelta['tool_calls_result'];
    };
    finish_reason?: string | null;
  }[];
  usage?: IStreamData['usage'];
}

const getStreamDelta = (data: IStreamData): IStreamDelta => {
  return data.choices?.[0]?.delta ?? {};
};

/** 把非流式的完整响应摊平成 ICompleteData，与 getStreamDelta 相对 */
export const toCompleteData = (json: ICompleteResponseJson): ICompleteData => {
  const choice = json.choices?.[0];
  const message = choice?.message ?? {};
  return {
    id: json.id,
    object: json.object,
    model: json.model,
    created: json.created,
    content: message.content,
    reasoning_content: message.reasoning_content,
    tool_calls: message.tool_calls,
    tool_calls_result: message.tool_calls_result,
    finish_reason: choice?.finish_reason,
    usage: json.usage,
  };
};

function onToolResult(
  toolCallsResult: any[],
  delta: IStreamDelta,
  toolCallIdMap: Record<string, IMessageItem & { type: 'tool' }>,
  chatMessage: IChatMessage,
  addToolCallContext: boolean,
) {
  toolCallsResult.forEach((toolCallResult) => {
    const {
      id,
      function: { arguments: args, result },
    } = toolCallResult;
    const toolCallItem = toolCallIdMap[id];
    if (!toolCallItem) {
      return;
    }

    toolCallItem.status = 'success';
    toolCallItem.content = JSON.stringify({ arguments: args, result }, null, 2);

    emitter.emit('notification', {
      type: 'tool',
      delta,
      toolCallData: readonly(toolCallItem),
      chatMessage: readonly(chatMessage),
    });

    if (addToolCallContext) {
      const { t } = useI18n();
      chatMessage.content +=
        t('toolCall.context', {
          toolName: toolCallItem.name,
          toolParams: JSON.stringify(args),
          toolResult: JSON.stringify(result),
        }) + '\n\n';
    }
  });
}

function onToolCall(
  toolCalls: any[],
  delta: IStreamDelta,
  toolCallIdMap: Record<string, IMessageItem & { type: 'tool' }>,
  chatMessage: IChatMessage,
  toolCallStatus: { inProcessToolCallId: string | null },
) {
  toolCalls.forEach((toolCall) => {
    const {
      id,
      function: { name, arguments: argsDelta },
    } = toolCall;

    let toolCallItem: IMessageItem & { type: 'tool' };
    // 有id的就是首次工具调用返回
    if (id) {
      toolCallStatus.inProcessToolCallId = id;
      toolCallItem = reactive({
        type: 'tool',
        name: name,
        formatPretty: true,
        status: 'running',
        content: JSON.stringify({ arguments: argsDelta || '' }, null, 2),
        id,
      });
      toolCallIdMap[id] = toolCallItem;
      chatMessage.messages.push(toolCallItem);
    } else {
      toolCallItem = toolCallIdMap[toolCallStatus.inProcessToolCallId];
      const prevArgs = JSON.parse(toolCallItem.content).arguments;
      const nextArgs = prevArgs + (argsDelta || '');

      toolCallItem.content = JSON.stringify({ arguments: nextArgs }, null, 2);
    }

    emitter.emit('notification', {
      type: 'tool',
      delta,
      toolCallData: readonly(toolCallItem),
      chatMessage: readonly(chatMessage),
    });
  });
}

function onReasoningContent(reasoningContent: string, delta: IStreamDelta, chatMessage: IChatMessage) {
  const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
  let reasoningMessage = lastMessage;
  if (reasoningMessage?.type === 'reasoning') {
    reasoningMessage.content += reasoningContent;
  } else {
    reasoningMessage = {
      type: 'reasoning',
      content: reasoningContent,
      thinking: true,
    };
    chatMessage.messages.push(reasoningMessage);
  }
  emitNotification(delta, chatMessage);
  return reasoningMessage;
}

function onReasoningEnd(reasoningMessage: IMessageItem) {
  if (reasoningMessage?.type === 'reasoning') reasoningMessage.thinking = false;
}

function emitNotification(delta: IStreamDelta, chatMessage: IChatMessage) {
  const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
  if (lastMessage) {
    emitter.emit('notification', {
      type: lastMessage.type as 'markdown' | 'schema-card',
      delta,
      chatMessage: readonly(chatMessage),
    });
  }
}

function onMarkdown(content: string, delta: IStreamDelta, chatMessage: IChatMessage) {
  if (chatMessage.messages.length > 0 && chatMessage.messages[chatMessage.messages.length - 1].type === 'markdown') {
    chatMessage.messages[chatMessage.messages.length - 1].content += content;
  } else {
    chatMessage.messages.push({
      type: 'markdown',
      content: content,
    });
  }
  emitNotification(delta, chatMessage);
}

function onSchemaJSON(content: string, delta: IStreamDelta, chatMessage: IChatMessage) {
  if (chatMessage.messages.length > 0 && chatMessage.messages[chatMessage.messages.length - 1].type === 'schema-card') {
    chatMessage.messages[chatMessage.messages.length - 1].content += content;
  } else {
    chatMessage.messages.push({
      type: 'schema-card',
      content: content,
      id: uuidv4(),
    });
  }
  emitNotification(delta, chatMessage);
}

function watchReasoningEnd(context: any) {
  context.unWatchReasoning = watch(
    () => [...context.chatMessage.messages],
    (newVal) => {
      if (context.handleReasoning && newVal[newVal.length - 1]?.type !== 'reasoning') {
        context.handleReasoning = false;
        onReasoningEnd(context.reasoningMessage);
        context.unWatchReasoning?.();
      }
    },
    { flush: 'sync' },
  );
}

// —— 以下四个切面处理函数同时服务两条路径 ——
// 流式：handler 逐块传入 delta；非流式：complete 把完整 message 一次性包成一个 delta 传入。
// 因此它们不关心「一次还是多次」，只关心「这一段内容是什么」。

function applyReasoning(delta: IStreamDelta, context: any) {
  context.reasoningMessage = onReasoningContent(delta.reasoning_content, delta, context.chatMessage);
  if (!context.handleReasoning) {
    watchReasoningEnd(context);
    context.handleReasoning = true;
  }
}

function applyToolCalls(delta: IStreamDelta, context: any) {
  onToolCall(delta.tool_calls, delta, context.toolCallIdMap, context.chatMessage, context.toolCallStatus);
}

function applyToolResults(delta: IStreamDelta, context: any) {
  onToolResult(
    delta.tool_calls_result,
    delta,
    context.toolCallIdMap,
    context.chatMessage,
    context.chatConfig.addToolCallContext,
  );
}

function applyContent(delta: IStreamDelta, context: any) {
  context.delta = delta;
  context.patternExtractor.handleContent(delta.content);
  context.chatMessage.content += delta.content;
}

export const defaultResponseHandlers: IResponseHandler<IStreamData>[] = [
  {
    name: 'init',
    match: (data: IStreamData, context: any) => false,
    handler: (data: IStreamData, context: any) => false,
    start: (
      context: any,
      handlers: { onData: (data: IChatMessage) => void; onDone: () => void; onError: (error: Error) => void },
    ) => {
      const chatMessage = reactive<IChatMessage>({
        role: 'assistant',
        content: '',
        messages: [],
      });
      context.chatMessage = chatMessage;
      context.handlers = handlers;
      handlers.onData(chatMessage);
      return false;
    },
    end: (context: any) => {
      context.handlers.onDone();
      emitter.emit('notification', {
        type: 'done',
        delta: {},
        chatMessage: readonly(context.chatMessage),
      });
    },
  },
  {
    name: 'finish-info',
    match: (data: IStreamData, context: any) => {
      const { choices, usage } = data;
      return choices?.[0]?.finish_reason && Boolean(usage);
    },
    handler: (data: IStreamData, context: any) => {
      context.chatMessage.finishInfo = data;
      return true;
    },
    complete: (data: ICompleteData, context: any) => {
      context.chatMessage.finishInfo = {
        id: data.id,
        object: data.object,
        model: data.model,
        created: data.created,
        choices: [{ index: 0, finish_reason: data.finish_reason ?? null }],
        usage: data.usage,
      };
    },
  },
  {
    name: 'reasoning',
    match: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      return Boolean(delta.reasoning_content);
    },
    handler: (data: IStreamData, context: any) => {
      applyReasoning(getStreamDelta(data), context);
      return true;
    },
    complete: (data: ICompleteData, context: any) => {
      if (!data.reasoning_content) return;
      applyReasoning({ reasoning_content: data.reasoning_content }, context);
    },
    start: (
      context: any,
      handlers: { onData: (data: IChatMessage) => void; onDone: () => void; onError: (error: Error) => void },
    ) => {
      context.handleReasoning = false;
    },
    end: (context: any) => {
      context.unWatchReasoning?.();
      if (context.handleReasoning) {
        context.handleReasoning = false;
        onReasoningEnd(context.reasoningMessage);
      }
    },
  },
  {
    name: 'toolCall',
    match: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      return delta.tool_calls?.length > 0;
    },
    handler: (data: IStreamData, context: any) => {
      applyToolCalls(getStreamDelta(data), context);
      return true;
    },
    complete: (data: ICompleteData, context: any) => {
      if (!data.tool_calls?.length) return;
      applyToolCalls({ tool_calls: data.tool_calls }, context);
    },
    start: (
      context: any,
      handlers: { onData: (data: IChatMessage) => void; onDone: () => void; onError: (error: Error) => void },
    ) => {
      context.toolCallIdMap = {};
      context.toolCallStatus = { inProcessToolCallId: null };
    },
  },
  {
    name: 'toolResult',
    match: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      return delta.tool_calls_result?.length > 0;
    },
    handler: (data: IStreamData, context: any) => {
      applyToolResults(getStreamDelta(data), context);
      return true;
    },
    complete: (data: ICompleteData, context: any) => {
      if (!data.tool_calls_result?.length) return;
      applyToolResults({ tool_calls_result: data.tool_calls_result }, context);
    },
  },
  {
    name: 'content',
    match: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      return Boolean(delta.content);
    },
    handler: (data: IStreamData, context: any) => {
      applyContent(getStreamDelta(data), context);
      return true;
    },
    // 非流式：整段内容一次性交给同一个 patternExtractor。
    // 注意 extractor 由 start 创建，这里只负责喂内容 —— playground 会在 start 之后覆盖
    // patternExtractor.onHandledWrite（按 framework 决定 schema-card 类型），所以不能在 complete 里重建它。
    complete: (data: ICompleteData, context: any) => {
      if (!data.content) return;
      applyContent({ content: data.content }, context);
    },
    start: (
      context: any,
      handlers: { onData: (data: IChatMessage) => void; onDone: () => void; onError: (error: Error) => void },
    ) => {
      const thinkPatternExtractor = new PatternExtractor({
        onNormalWrite: (value) => onMarkdown(value, context.delta, context.chatMessage),
        onHandledWrite: (value) => {
          context.reasoningMessage = onReasoningContent(value, context.delta, context.chatMessage);
          if (!context.handleReasoning) {
            watchReasoningEnd(context);
            context.handleReasoning = true;
          }
        },
        regExpMap: new ThinkTagWrapPattern().regExpMap,
      });
      context.patternExtractor = new PatternExtractor({
        onNormalWrite: (value) => thinkPatternExtractor.handleContent(value),
        onHandledWrite: (value) => onSchemaJSON(value, context.delta, context.chatMessage),
      });
    },
  },
];
