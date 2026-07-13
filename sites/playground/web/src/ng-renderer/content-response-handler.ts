import type { IChatMessage, IStreamDelta } from "@opentiny/genui-sdk-core";
import { v4 as uuidv4 } from 'uuid';

import { toRaw, type Ref } from "vue";
import { emitter } from "@opentiny/genui-sdk-vue";

function emitNotification(delta: IStreamDelta, chatMessage: IChatMessage) {
    const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
    if (lastMessage) {
        emitter.emit('notification', {
        type: lastMessage.type as 'markdown' | 'schema-card', // TODO: 后续支持其他类型
        delta,
        chatMessage: structuredClone(toRaw(chatMessage)),
      });
    }
  };
function onSchemaJsonForFramework(content: string, delta: IStreamDelta, chatMessage: IChatMessage, framework: string) {
    const currentSchemaType = framework === 'Angular' ? 'schema-card-angular' as 'schema-card' : 'schema-card';
    if (chatMessage.messages.length > 0 && chatMessage.messages[chatMessage.messages.length - 1].type === currentSchemaType) {
      chatMessage.messages[chatMessage.messages.length - 1].content += content;
    } else {
      chatMessage.messages.push({
        type: currentSchemaType,
        content: content,
        id: uuidv4(),
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
        onSchemaJsonForFramework(value, context.delta, context.chatMessage,context.framework);
    }
  }
}
