import { IChatMessage, IMessageItem, IStreamDelta, IStreamData, PatternExtractor } from '@opentiny/genui-sdk-core';
import { ThinkTagWrapPattern } from './think-tag-wrap-pattern';
import { reactive, readonly, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { emitter } from './event-emitter';
import { useI18n } from './i18n';
import type { ChatMessage, UseMessagePlugin } from '@opentiny/tiny-robot-kit';
import type { IChatConfig } from './chat.types';

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
}

const getStreamDelta = (data: IStreamData): IStreamDelta => {
  return data.choices?.[0]?.delta ?? {};
};

function onToolResult(
  toolCallsResult: any[],
  delta: IStreamDelta,
  toolCallIdMap: Record<string, IMessageItem & { type: 'tool' }>,
  chatMessage: IChatMessage,
  addToolCallContext: boolean,
) {
  const {
    id,
    function: { arguments: args, result },
  } = toolCallsResult[0];
  const toolCallItem = toolCallIdMap[id];
  if (toolCallItem) {
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
  }
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

export const defaultResponseHandlers: IResponseHandler<IStreamData>[] = [
  {
    name: 'init',
    match: (data: IStreamData, context: any) => false,
    handler: (data: IStreamData, context: any) => false,
    start: (
      context: any,
      handlers: { onData: (data: IChatMessage) => void; onDone: () => void; onError: (error: Error) => void },
    ) => {
      const chatMessage =
        context.chatMessage ??
        reactive<IChatMessage>({
          role: 'assistant',
          content: '',
          messages: [],
        });
      chatMessage.messages ??= [];
      chatMessage.content ??= '';
      context.chatMessage = chatMessage;
      context.handlers = handlers;
      if (!context.usesOfficialMessageEngine) {
        handlers.onData(chatMessage);
      }
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
  },
  {
    name: 'reasoning',
    match: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      return Boolean(delta.reasoning_content);
    },
    handler: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      context.reasoningMessage = onReasoningContent(delta.reasoning_content, delta, context.chatMessage);
      if (!context.handleReasoning) {
        watchReasoningEnd(context);
        context.handleReasoning = true;
      }
      return true;
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
      const delta = getStreamDelta(data);
      onToolCall(delta.tool_calls, delta, context.toolCallIdMap, context.chatMessage, context.toolCallStatus);
      return true;
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
      const delta = getStreamDelta(data);
      onToolResult(
        delta.tool_calls_result,
        delta,
        context.toolCallIdMap,
        context.chatMessage,
        context.chatConfig.addToolCallContext,
      );
      return true;
    },
  },
  {
    name: 'content',
    match: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      return Boolean(delta.content);
    },
    handler: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      context.delta = delta;
      context.patternExtractor.handleContent(delta.content);
      context.chatMessage.content += delta.content;
      return true;
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

export interface ResponseHandlerController {
  handleChunk: (turnId: string | null, currentMessage: ChatMessage, chunk: IStreamData) => void;
  finish: (turnId: string | null, currentMessage?: ChatMessage) => void;
  fail: (turnId: string | null, error: unknown) => void;
}

export function createResponseHandlerController(options: {
  getHandlers: () => IResponseHandler<IStreamData>[];
  getChatConfig: () => IChatConfig;
  getContext?: () => Record<string, unknown>;
}): ResponseHandlerController {
  const contexts = new Map<string, any>();
  const keyOf = (turnId: string | null) => turnId ?? '__default__';

  const ensureContext = (turnId: string | null, currentMessage: ChatMessage) => {
    const key = keyOf(turnId);
    let context = contexts.get(key);
    if (context) {
      context.chatMessage = currentMessage;
      return context;
    }

    context = {
      ...options.getContext?.(),
      chatConfig: options.getChatConfig(),
      chatMessage: currentMessage,
      usesOfficialMessageEngine: true,
    };
    const noops = {
      onData: () => undefined,
      onDone: () => undefined,
      onError: () => undefined,
    };
    for (const handler of options.getHandlers()) {
      handler.beforeRequest?.(context);
      handler.start?.(context, noops);
    }
    contexts.set(key, context);
    return context;
  };

  return {
    handleChunk(turnId, currentMessage, chunk) {
      const context = ensureContext(turnId, currentMessage);
      for (const handler of options.getHandlers()) {
        if (handler.match(chunk, context)) {
          if (handler.handler(chunk, context)) break;
        } else if (handler.notMatchHandler?.(chunk, context)) {
          break;
        }
      }
    },
    finish(turnId, currentMessage) {
      const key = keyOf(turnId);
      const context = currentMessage ? ensureContext(turnId, currentMessage) : contexts.get(key);
      if (!context) return;
      for (const handler of options.getHandlers()) {
        handler.end?.(context);
      }
      contexts.delete(key);
    },
    fail(turnId, error) {
      const key = keyOf(turnId);
      const context = contexts.get(key) ?? { chatConfig: options.getChatConfig(), usesOfficialMessageEngine: true };
      for (const handler of options.getHandlers()) {
        handler.onRequestError?.(context, error);
      }
      contexts.delete(key);
    },
  };
}

export function createResponseHandlerPlugin(controller: ResponseHandlerController): UseMessagePlugin {
  return {
    name: 'genui-response-handlers',
    onAfterRequest(context) {
      controller.finish(context.turnId, context.currentMessage);
    },
    onTurnAbort(context) {
      controller.finish(context.turnId);
    },
    onError(context) {
      controller.fail(context.turnId, context.error);
      const error = context.error instanceof Error ? context.error : new Error(String(context.error));
      context.appendMessage({
        role: 'assistant',
        content: '',
        messages: [{ type: 'error-text', content: error.message }],
      } as ChatMessage);
    },
  };
}
