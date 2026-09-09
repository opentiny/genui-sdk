import type { IChatMessage, IStreamDelta } from '@opentiny/genui-sdk-core';
import { v4 as uuidv4 } from 'uuid';

import { readonly, type Ref } from 'vue';
import { emitter } from '@opentiny/genui-sdk-vue';

function emitNotification(delta: IStreamDelta, chatMessage: IChatMessage) {
  const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
  const notificationType = lastMessage.type?.startsWith('schema-card-') ? 'schema-card' : lastMessage.type;
  if (lastMessage) {
    emitter.emit('notification', {
      type: notificationType,
      delta,
      chatMessage: readonly(chatMessage),
    });
  }
}
const cardTypeMap: Record<string, string> = {
  Angular: 'schema-card-angular',
  Vue: 'schema-card',
};

function onSchemaJsonForFramework(content: string, delta: IStreamDelta, chatMessage: IChatMessage, framework: string) {
  const currentSchemaType = cardTypeMap[framework] ?? 'schema-card';
  if (
    chatMessage.messages.length > 0 &&
    chatMessage.messages[chatMessage.messages.length - 1].type === currentSchemaType
  ) {
    chatMessage.messages[chatMessage.messages.length - 1].content += content;
  } else {
    chatMessage.messages.push({
      type: currentSchemaType,
      content: content,
      id: uuidv4(),
      framework,
    });
  }
  emitNotification(delta, chatMessage);
}

export function getMixedContentHandler(contentHandler, framework: Ref<string>) {
  return {
    ...contentHandler,
    start: (context, handlers) => {
      context.framework = framework.value;
      contentHandler.start(context, handlers);
      context.patternExtractor.onHandledWrite = (value) =>
        onSchemaJsonForFramework(value, context.delta, context.chatMessage, context.framework);
    },
  };
}
