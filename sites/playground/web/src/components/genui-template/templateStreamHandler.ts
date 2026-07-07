import { reactive, toRaw } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { PatternExtractor } from '@opentiny/genui-sdk-core';
import type { IStreamDelta, IStreamData } from '@opentiny/genui-sdk-core';
import type { IChatMessage, IMessageItem } from './chat.types';
import { emitter } from './template-chat-event-emitter';

interface TemplateStreamContext {
  initialized: boolean;
  chatMessage?: ChatMessage & { messages?: IMessageItem[] };
  input?: string;
  messageId?: string;
  currentDelta: IStreamDelta;
  schemaJsonExtractor: PatternExtractor;
  jsonPatchExtractor: PatternExtractor;
}

const patchStart = '```jsonPatch';
const endFlag = '```';

const getPartialStartRegString = (flag: string) =>
  flag
    .split('')
    .reverse()
    .reduce((acc, cur) => `${cur}(${acc})?`, '');

const createExtractors = (ctx: TemplateStreamContext) => {
  const onMarkdown = (content: string) => {
    const chatMessage = ctx.chatMessage;
    if (!chatMessage?.messages) {
      return;
    }

    if (
      chatMessage.messages.length > 0 &&
      chatMessage.messages[chatMessage.messages.length - 1].type === 'markdown'
    ) {
      chatMessage.messages[chatMessage.messages.length - 1].content += content;
    } else {
      chatMessage.messages.push({
        type: 'markdown',
        content,
        input: ctx.input ?? '',
        cardId: ctx.messageId ?? '',
      });
    }

    emitter.emit('notification', {
      type: 'markdown',
      delta: ctx.currentDelta,
      chatMessage: structuredClone(toRaw(chatMessage)) as IChatMessage,
    });
  };

  const onHandledContent = (content: string, currentSchemaType: 'schema-card' | 'json-patch') => {
    const chatMessage = ctx.chatMessage;
    if (!chatMessage?.messages) {
      return;
    }

    let isNewMessage = false;
    if (
      chatMessage.messages.length > 0 &&
      chatMessage.messages[chatMessage.messages.length - 1].type === currentSchemaType
    ) {
      chatMessage.messages[chatMessage.messages.length - 1].content += content;
    } else {
      chatMessage.messages.push({
        type: currentSchemaType,
        content,
        input: ctx.input ?? '',
        cardId: ctx.messageId ?? '',
        generatedTime: '',
        schema: '',
        prevSchema: '',
      });
      isNewMessage = true;
    }

    emitter.emit('schema-json-changed', {
      type: currentSchemaType,
      newMessage: isNewMessage,
      delta: ctx.currentDelta,
      cardId: ctx.messageId,
      content: chatMessage.messages[chatMessage.messages.length - 1].content,
    });
  };

  const jsonPatchExtractor = new PatternExtractor({
    onNormalWrite: (value) => onMarkdown(value),
    onHandledWrite: (value) => onHandledContent(value, 'json-patch'),
    regExpMap: {
      start: {
        full: new RegExp(`${patchStart}`),
        partial: new RegExp(`(${getPartialStartRegString(patchStart)})$`),
      },
      end: {
        full: new RegExp(`\\n\\s*${endFlag}`),
        partial: new RegExp(`\\n(\\s*${getPartialStartRegString(endFlag)})?$`),
      },
    },
  });

  const schemaJsonExtractor = new PatternExtractor({
    onNormalWrite: (value) => jsonPatchExtractor.handleContent(value),
    onHandledWrite: (value) => onHandledContent(value, 'schema-card'),
  });

  ctx.jsonPatchExtractor = jsonPatchExtractor;
  ctx.schemaJsonExtractor = schemaJsonExtractor;
};

export function createTemplateStreamHandlerOptions() {
  const ensureContext = (customContext: Record<string, unknown>): TemplateStreamContext => {
    let ctx = customContext.templateStream as TemplateStreamContext | undefined;
    if (!ctx) {
      ctx = {
        initialized: false,
        currentDelta: {},
        schemaJsonExtractor: null as unknown as PatternExtractor,
        jsonPatchExtractor: null as unknown as PatternExtractor,
      };
      customContext.templateStream = ctx;
    }
    return ctx;
  };

  const initOnFirstChunk = (
    ctx: TemplateStreamContext,
    currentMessage: ChatMessage,
    allMessages: ChatMessage[],
  ) => {
    if (ctx.initialized) {
      return;
    }

    const messageRecord = currentMessage as ChatMessage & { messages?: IMessageItem[] };
    if (!messageRecord.messages) {
      messageRecord.messages = reactive([]);
    }

    const lastUser = [...allMessages].reverse().find((item) => item.role === 'user') as
      | (ChatMessage & { messageId?: string })
      | undefined;

    ctx.chatMessage = messageRecord;
    ctx.input = typeof lastUser?.content === 'string' ? lastUser.content : '';
    ctx.messageId = lastUser?.messageId;
    createExtractors(ctx);
    ctx.initialized = true;
  };

  return {
    onCompletionChunk: (
      context: {
        chunk: unknown;
        currentMessage: ChatMessage;
        messages: ChatMessage[];
        customContext: Record<string, unknown>;
      },
      _runDefault: () => void,
    ) => {
      const ctx = ensureContext(context.customContext);
      initOnFirstChunk(ctx, context.currentMessage, context.messages);

      const streamData = context.chunk as IStreamData;
      const delta = streamData.choices?.[0]?.delta || {};
      const { content } = delta;

      if (content === undefined || !ctx.chatMessage) {
        return;
      }

      ctx.currentDelta = delta;
      ctx.chatMessage.content = `${ctx.chatMessage.content ?? ''}${content}`;
      ctx.schemaJsonExtractor.handleContent(content);
    },
    onTurnEnd: (context: { customContext: Record<string, unknown> }) => {
      const ctx = context.customContext.templateStream as TemplateStreamContext | undefined;
      if (!ctx?.chatMessage) {
        return;
      }

      emitter.emit('notification', {
        type: 'done',
        delta: {},
        chatMessage: structuredClone(toRaw(ctx.chatMessage)) as IChatMessage,
        cardId: ctx.messageId,
        input: ctx.input,
      });

      ctx.initialized = false;
      ctx.chatMessage = undefined;
    },
    onError: (context: { currentTurn: ChatMessage[]; error: unknown }) => {
      const lastMessage = context.currentTurn[context.currentTurn.length - 1] as
        | (ChatMessage & { messages?: { type: string; content: string }[] })
        | undefined;
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
