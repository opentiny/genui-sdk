import { OverlapEliminator } from "../components/overlap-eliminator";
import { findLastContinueWritingMessage } from "./message-utils";
import { removeSensitiveInfoWarning } from "./remove-sensitive-info-warning";

export const movePartialSchemaJsonToLastMessage = () => {
  return {
    name: 'movePartialSchemaJsonToLastMessage',
    match: (data, context) => {
      const currentIndex = context.chatMessage?.messages?.length - 1;
      const partialSchemaJsonIndex = context.partialSchemaJsonIndex;
      return data.content && partialSchemaJsonIndex !== -1 && partialSchemaJsonIndex < currentIndex;
    },
    handler: (data, context) => {
      const chatMessage = context.chatMessage;
      const partialSchemaJsonIndex = context.partialSchemaJsonIndex;
      const partialSchemaJson = chatMessage.messages.splice(partialSchemaJsonIndex, 1)[0];
      chatMessage.messages.push(partialSchemaJson);
      context.partialSchemaJsonIndex = -1;
      return false;
    }
  }
}

export const locationPartialSchemaJson = () => {
  return {
    name: 'locationPartialSchemaJson',
    start: (context, handlers) => {
      const { message, index } = findLastContinueWritingMessage(context.chatMessage);
      context.partialSchemaJsonIndex = message.type === 'schema-card' ? index : -1;
    },
  }
}

export const getOverlapEliminatorHandler = (contentHandler: any) => {
  return {
    name: 'overlapEliminator',
    match: (data, context) => {
      return data.content && !context.overlapEliminated;
    },
    handler: (data, context) => {
      const { pending, eliminated, overlapString } = OverlapEliminator.eliminateOverlap(context.chatMessage.content, context.overlapPending + data.content);
      if (import.meta.env.MODE === 'development') {
        console.info('overlapEliminator: content:', context.overlapPending + data.content, 'pending', pending, 'eliminated', eliminated, 'overlapString', overlapString);
      }
      if (pending != null) {
        context.overlapPending = pending;
        return true;
      }
      if (eliminated != null) {
        context.overlapPending = '';
        context.overlapEliminated = true;
        data.content = eliminated;

        return false; // 返回 false 由后面的 content handler 继续处理 data.content
      }

      context.overlapEliminated = true;
      data.content = context.overlapPending + data.content;
      context.overlapPending = '';
      return false;
    },
    start: (context, handlers) => {
      context.overlapPending = '';
      context.overlapEliminated = true;
    },
    end: (context) => {
      if (context.overlapPending) {
        contentHandler.handler({ content: context.overlapPending }, context);
        context.overlapPending = '';
        context.overlapEliminated = true;
      }
    },
  }
}

export const getContinueGeneratingHandler = (messageManager: any) => {
  return {
    name: 'continueGenerating',
    match: (data, context) => {
      return false;
    },
    handler: (data, context) => {
      return false;
    },
    start: (context, handlers) => {
      const messages = messageManager.value.messages;
      const chatMessage = messages.value[messages.value.length - 2];

      if (chatMessage.requireMore) {
        context.overlapEliminated = false;
        messages.value = messages.value.slice(0, messages.value.length - 1);
        context.chatMessage = chatMessage;
        delete context.chatMessage.requireMore;
        context.chatMessage.originChatMessage = JSON.stringify(context.chatMessage);

        removeSensitiveInfoWarning(chatMessage);
        const { message } = findLastContinueWritingMessage(context.chatMessage);
        context.patternExtractor.setState(message.type === 'schema-card' ? 'handling' : 'normal');
      }
    }
  };
}