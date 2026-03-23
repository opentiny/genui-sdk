import { IChatMessage, IMessageItem, IStreamDelta, IStreamData, PatternExtractor } from "@opentiny/genui-sdk-core";
import { reactive, toRaw } from "vue";
import { v4 as uuidv4 } from 'uuid';
import { emitter } from './event-emitter';
import { useI18n } from './i18n';

export interface IResponseHandler<T> {
  name: string;
  match: (data: T, context: any) => boolean;
  handler: (data: T, context: any) => boolean;
  notMatchHandler?: (data: T, context: any) => boolean;
  start?: (context: any, handlers: { onData: (data: IChatMessage) => void, onDone: () => void, onError: (error: Error) => void }) => void;
  end?: (context: any) => void;
}

const getStreamDelta = (data: IStreamData): IStreamDelta => {
  return data.choices?.[0]?.delta ?? {};
};

function onToolResult(toolCallsResult: any[], delta: IStreamDelta, toolCallIdMap: Record<string, IMessageItem & { type: 'tool' }>, chatMessage: IChatMessage, addToolCallContext: boolean) {
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
      toolCallData: structuredClone(toRaw(toolCallItem)),
      chatMessage: structuredClone(toRaw(chatMessage)),
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
};

function onToolCall(toolCalls: any[], delta: IStreamDelta, toolCallIdMap: Record<string, IMessageItem & { type: 'tool' }>, chatMessage: IChatMessage, toolCallStatus: { inProcessToolCallId: string | null }) {
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
      toolCallData: toolCallItem,
      chatMessage: structuredClone(toRaw(chatMessage)),
    });

  });

};

function onReasoningContent(reasoningContent: string, chatMessage: IChatMessage) {
  const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
  if (lastMessage?.type === 'reasoning') {
    lastMessage.content += reasoningContent;
  } else {
    chatMessage.messages.push({
      type: 'reasoning',
      content: reasoningContent,
      thinking: true,
    });
  }
};

function onReasoningEnd(chatMessage: IChatMessage) {
  const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
  if (lastMessage?.type === 'reasoning') lastMessage.thinking = false;
};

function emitNotification(delta: IStreamDelta, chatMessage: IChatMessage) {
  const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
  if (lastMessage) {
    emitter.emit('notification', {
      type: lastMessage.type as 'markdown' | 'schema-card',
      delta,
      chatMessage: structuredClone(toRaw(chatMessage)),
    });
  }
};

function onMarkdown(content: string, delta: IStreamDelta, chatMessage: IChatMessage) {
  if (chatMessage.messages.length > 0 && chatMessage.messages[chatMessage.messages.length - 1].type === 'markdown') {
    chatMessage.messages[chatMessage.messages.length - 1].content += content;
  } else {
    chatMessage.messages.push({
      type: 'markdown',
      content: content
    });
  }
  emitNotification(delta, chatMessage);
};

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

export const defaultResponseHandlers: IResponseHandler<IStreamData>[] = [
  {
    name: 'init',
    match: (data: IStreamData, context: any) => false,
    handler: (data: IStreamData, context: any) => false,
    start: (context: any, handlers: { onData: (data: IChatMessage) => void, onDone: () => void, onError: (error: Error) => void }) => {
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
        chatMessage: structuredClone(toRaw(context.chatMessage)),
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
      return delta.reasoning_content !== undefined;
    },
    handler: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      onReasoningContent(delta.reasoning_content, context.chatMessage);
      emitNotification(delta, context.chatMessage);
      return true;
    },
    notMatchHandler: (data: IStreamData, context: any) => {
      onReasoningEnd(context.chatMessage);
      return false;
    },
    end: (context: any) => {
      onReasoningEnd(context.chatMessage);
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
    start: (context: any, handlers: { onData: (data: IChatMessage) => void, onDone: () => void, onError: (error: Error) => void }) => {
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
      onToolResult(delta.tool_calls_result, delta, context.toolCallIdMap, context.chatMessage, context.chatConfig.addToolCallContext);
      return true;
    },
  },
  {
    name: 'content',
    match: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      return delta.content !== undefined;
    },
    handler: (data: IStreamData, context: any) => {
      const delta = getStreamDelta(data);
      context.delta = delta;
      context.patternExtractor.handleContent(delta.content)
      context.chatMessage.content += delta.content;
      return true;
    },
    start: (context: any, handlers: { onData: (data: IChatMessage) => void, onDone: () => void, onError: (error: Error) => void }) => {
      context.patternExtractor = new PatternExtractor({
        onNormalWrite: (value) => onMarkdown(value, context.delta, context.chatMessage),
        onHandledWrite: (value) => onSchemaJSON(value, context.delta, context.chatMessage),
      });
    },
  }
];
