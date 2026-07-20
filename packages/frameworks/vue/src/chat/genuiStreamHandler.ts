import { reactive } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { IStreamData } from '@opentiny/genui-sdk-core';
import {
  defaultResponseHandlers,
  type IResponseHandler,
} from './response-handler';
import { emitter } from './event-emitter';
import type { IChatConfig } from './chat.types';

export interface GenuiStreamHandlerContext {
  handlerContext: Record<string, any>;
  handlers: IResponseHandler<IStreamData>[];
  initialized: boolean;
}

export interface GenuiChunkContext {
  chunk: unknown;
  currentMessage: ChatMessage;
  customContext: Record<string, unknown>;
  setCustomContext: (data: Record<string, unknown>) => void;
}

export function createGenuiStreamHandlerOptions(options: {
  getChatConfig: () => IChatConfig;
  getResponseHandlers?: () => IResponseHandler<IStreamData>[];
}) {
  const ensureStreamContext = (ctx: GenuiChunkContext): GenuiStreamHandlerContext => {
    let streamCtx = ctx.customContext.genuiStream as GenuiStreamHandlerContext | undefined;

    if (!streamCtx) {
      streamCtx = {
        handlerContext: { chatConfig: options.getChatConfig() },
        handlers: options.getResponseHandlers?.() ?? defaultResponseHandlers,
        initialized: false,
      };
      ctx.setCustomContext({ genuiStream: streamCtx });
    }

    return streamCtx;
  };

  const initStreamOnFirstChunk = (ctx: GenuiChunkContext, streamCtx: GenuiStreamHandlerContext) => {
    streamCtx.handlerContext.chatConfig = options.getChatConfig();

    if (streamCtx.initialized) {
      return;
    }

    const { currentMessage } = ctx;
    const messageRecord = currentMessage as ChatMessage & { messages?: unknown[]; role?: string };

    if (!messageRecord.role) {
      messageRecord.role = 'assistant';
    }

    if (!messageRecord.messages) {
      messageRecord.messages = reactive([]);
    }

    streamCtx.handlerContext.chatMessage = currentMessage;

    const dummyHandlers = {
      onData: () => {},
      onDone: () => {},
      onError: () => {},
    };

    streamCtx.handlerContext.handlers = dummyHandlers;

    for (const handler of streamCtx.handlers) {
      if (handler.name === 'init') {
        continue;
      }
      handler.start?.(streamCtx.handlerContext, dummyHandlers);
    }

    streamCtx.initialized = true;
  };

  const processChunk = (ctx: GenuiChunkContext) => {
    const streamCtx = ensureStreamContext(ctx);
    initStreamOnFirstChunk(ctx, streamCtx);

    const streamData = ctx.chunk as IStreamData;

    for (const handler of streamCtx.handlers) {
      if (handler.match(streamData, streamCtx.handlerContext)) {
        if (handler.handler(streamData, streamCtx.handlerContext)) {
          if (handler.name !== 'toolCall' && handler.name !== 'toolResult') {
            break;
          }
        }
      } else if (handler.notMatchHandler?.(streamData, streamCtx.handlerContext)) {
        break;
      }
    }
  };

  const finishStream = (customContext: Record<string, unknown>) => {
    const streamCtx = customContext.genuiStream as GenuiStreamHandlerContext | undefined;
    if (!streamCtx) {
      return;
    }

    for (const handler of streamCtx.handlers) {
      handler.end?.(streamCtx.handlerContext);
    }

    const chatMessage = streamCtx.handlerContext.chatMessage;
    if (chatMessage) {
      emitter.emit('notification', {
        type: 'done',
        delta: {},
        chatMessage,
      });
    }
  };

  return {
    onCompletionChunk: (
      context: GenuiChunkContext & { customContext: Record<string, unknown> },
      _runDefault: () => void,
    ) => {
      processChunk(context);
    },
    onTurnEnd: (context: { customContext: Record<string, unknown> }) => {
      finishStream(context.customContext);
    },
    onError: (context: { customContext: Record<string, unknown>; error: unknown; currentTurn: ChatMessage[] }) => {
      const lastMessage = context.currentTurn[context.currentTurn.length - 1] as (ChatMessage & { messages?: { type: string; content: string }[] }) | undefined;
      if (!lastMessage || lastMessage.role !== 'assistant') {
        return;
      }

      if (!lastMessage.messages) {
        lastMessage.messages = [];
      }

      lastMessage.messages.push({
        type: 'error-text',
        content: context.error instanceof Error ? context.error.message : String(context.error),
      });
    },
  };
}
