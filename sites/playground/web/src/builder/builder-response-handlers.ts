import type { IChatMessage, IStreamData, IStreamDelta } from '@opentiny/genui-sdk-core';
import { PatternExtractor } from '@opentiny/genui-sdk-core';
import { ThinkTagWrapPattern } from '@opentiny/genui-sdk-vue';
import type { IResponseHandler } from '../types';
import { reactive, toRaw } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import { emitter } from '@opentiny/genui-sdk-vue';
import { getBuilderLastUserInput } from './builder-request-context';
import {
  extractBuilderSchemaFromContent,
  extractTitleFromSchema,
  parsePreviewSchema,
  type IBuilderCardMessageItem,
} from './builder-schema-utils';

const getStreamDelta = (data: IStreamData): IStreamDelta => data.choices?.[0]?.delta ?? {};

function formatCreatedTime(date: Date) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function getOrCreateBuilderCard(chatMessage: IChatMessage, input: string) {
  const messages = chatMessage.messages as unknown as IBuilderCardMessageItem[];
  const lastMessage = messages[messages.length - 1];

  if (lastMessage?.type === 'builder-card') {
    return lastMessage;
  }

  const card: IBuilderCardMessageItem = {
    type: 'builder-card',
    id: uuidv4(),
    title: '',
    input,
    schema: '',
    createdTime: '',
  };
  messages.push(card);
  return card;
}

function onBuilderSchema(content: string, chatMessage: IChatMessage, input: string) {
  const card = getOrCreateBuilderCard(chatMessage, input);
  card.schema += content;
}

function flushBuilderExtractors(context: {
  thinkPatternExtractor?: PatternExtractor;
  patternExtractor?: PatternExtractor;
}) {
  context.thinkPatternExtractor?.flush();
  context.patternExtractor?.flush();
}

function finalizeBuilderCard(context: { chatMessage?: IChatMessage; builderInput?: string }) {
  const chatMessage = context.chatMessage;
  if (!chatMessage?.messages?.length) {
    return;
  }

  const messages = chatMessage.messages as unknown as IBuilderCardMessageItem[];
  const lastMessage = messages[messages.length - 1];

  if (lastMessage?.type !== 'builder-card') {
    return;
  }

  const recovered = extractBuilderSchemaFromContent(chatMessage.content || '');
  if (recovered) {
    const currentParseOk = Boolean(parsePreviewSchema(lastMessage.schema));
    if (!currentParseOk || recovered.length > lastMessage.schema.length) {
      lastMessage.schema = recovered;
    }
  }

  if (!lastMessage.createdTime) {
    lastMessage.createdTime = formatCreatedTime(new Date());
  }

  lastMessage.title = extractTitleFromSchema(lastMessage.schema, lastMessage.input || context.builderInput || '');
}

export function createBuilderResponseHandlers(): IResponseHandler<IStreamData>[] {
  return [
    {
      name: 'init',
      match: () => false,
      handler: () => false,
      start: (context, handlers) => {
        const chatMessage = reactive<IChatMessage>({
          role: 'assistant',
          content: '',
          messages: [],
        });
        context.chatMessage = chatMessage;
        context.handlers = handlers;
        context.builderInput = getBuilderLastUserInput();
        handlers.onData(chatMessage);
        return false;
      },
      end: (context) => {
        flushBuilderExtractors(context);
        finalizeBuilderCard(context);
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
      match: (data) => {
        const { choices, usage } = data;
        return Boolean(choices?.[0]?.finish_reason && usage);
      },
      handler: (data, context) => {
        context.chatMessage.finishInfo = data;
        return true;
      },
    },
    {
      name: 'content',
      match: (data) => Boolean(getStreamDelta(data).content),
      handler: (data, context) => {
        const delta = getStreamDelta(data);
        context.delta = delta;
        context.patternExtractor.handleContent(delta.content || '');
        context.chatMessage.content += delta.content || '';
        return true;
      },
      start: (context) => {
        const thinkPatternExtractor = new PatternExtractor({
          onNormalWrite: (value) =>
            onBuilderSchema(value, context.chatMessage, context.builderInput || ''),
          onHandledWrite: () => {},
          regExpMap: new ThinkTagWrapPattern().regExpMap,
        });
        context.thinkPatternExtractor = thinkPatternExtractor;
        context.patternExtractor = new PatternExtractor({
          onNormalWrite: (value) => thinkPatternExtractor.handleContent(value),
          onHandledWrite: (value) =>
            onBuilderSchema(value, context.chatMessage, context.builderInput || ''),
        });
      },
    },
  ];
}
