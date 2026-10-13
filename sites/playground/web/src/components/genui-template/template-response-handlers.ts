import { reactive, toRaw } from 'vue';
import { PatternExtractor, type IStreamData, type IStreamDelta } from '@opentiny/genui-sdk-core';
import type { IResponseHandler } from '@opentiny/genui-sdk-vue';
import type { IChatMessage } from './chat.types';

const getStreamDelta = (data: IStreamData): IStreamDelta => data.choices?.[0]?.delta ?? {};

const getPartialStartRegString = (flag: string) =>
  flag
    .split('')
    .reverse()
    .reduce((acc, cur) => `${cur}(${acc})?`, '');

function setupPatternExtractors(context: Record<string, any>) {
  const { chatMessage, messageId, input, emitter } = context;

  const onMarkdown = (content: string, delta: IStreamDelta) => {
    if (
      chatMessage.messages.length > 0
      && chatMessage.messages[chatMessage.messages.length - 1].type === 'markdown'
    ) {
      chatMessage.messages[chatMessage.messages.length - 1].content += content;
    } else {
      chatMessage.messages.push({
        type: 'markdown',
        content,
        input,
        cardId: messageId,
      });
    }
    emitter.emit('notification', {
      type: 'markdown',
      delta,
      chatMessage: structuredClone(toRaw(chatMessage)),
    });
  };

  const onHandledContent = (
    content: string,
    delta: IStreamDelta,
    currentSchemaType: 'schema-card' | 'json-patch',
  ) => {
    let isNewMessage = false;
    if (
      chatMessage.messages.length > 0
      && chatMessage.messages[chatMessage.messages.length - 1].type === currentSchemaType
    ) {
      chatMessage.messages[chatMessage.messages.length - 1].content += content;
    } else {
      chatMessage.messages.push({
        type: currentSchemaType,
        content,
        input,
        cardId: messageId,
        generatedTime: '',
        schema: '',
        prevSchema: '',
      });
      isNewMessage = true;
    }
    emitter.emit('schema-json-changed', {
      type: currentSchemaType,
      newMessage: isNewMessage,
      delta,
      cardId: messageId,
      content: chatMessage.messages[chatMessage.messages.length - 1].content,
    });
  };

  const patchStart = '```jsonPatch';
  const endFlag = '```';

  const jsonPatchExtractor = new PatternExtractor({
    onNormalWrite: (value) => onMarkdown(value, context.delta ?? {}),
    onHandledWrite: (value) => onHandledContent(value, context.delta ?? {}, 'json-patch'),
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

  context.patternExtractor = new PatternExtractor({
    onNormalWrite: (value) => jsonPatchExtractor.handleContent(value),
    onHandledWrite: (value) => onHandledContent(value, context.delta ?? {}, 'schema-card'),
  });
}

export function createTemplateResponseHandlers(): IResponseHandler<IStreamData>[] {
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
        handlers.onData(chatMessage as Parameters<typeof handlers.onData>[0]);
      },
      end: (context) => {
        context.emitter.emit('notification', {
          type: 'done',
          delta: {},
          chatMessage: structuredClone(toRaw(context.chatMessage)),
          cardId: context.requestId,
          input: context.input,
        });
        context.handlers.onDone();
      },
    },
    {
      name: 'content',
      match: (data) => getStreamDelta(data).content !== undefined,
      handler: (data, context) => {
        const delta = getStreamDelta(data);
        context.delta = delta;
        context.chatMessage.content += delta.content;
        context.patternExtractor.handleContent(delta.content);
        return true;
      },
      start: (context) => {
        setupPatternExtractors(context);
      },
    },
  ];
}
