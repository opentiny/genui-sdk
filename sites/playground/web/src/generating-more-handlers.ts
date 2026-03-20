import { OverlapEliminator } from "./components/overlap-eliminator";

function removeSensitiveContent(chatMessage: Record<string, any>) {
  const sensitiveContent = `\n\nThe current content involves sensitive information. Please try a new topic.`;
  if (chatMessage.content.indexOf(sensitiveContent) !== -1) {
    chatMessage.content = chatMessage.content.slice(0, chatMessage.content.indexOf(sensitiveContent));
    const messages = chatMessage.messages;
    if (messages?.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.content.indexOf(sensitiveContent) !== -1) {
        lastMessage.content = lastMessage.content.slice(0, lastMessage.content.indexOf(sensitiveContent));
      }
    }
  }
}

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
        contentHandler.handler(context.overlapPending, context);
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

      if (chatMessage.requireMore || (chatMessage.prefix)) {
        context.overlapEliminated = false;
        messages.value = messages.value.slice(0, messages.value.length - 1);
        context.chatMessage = chatMessage;
        delete context.chatMessage.requireMore;
        context.chatMessage.originChatMessage = JSON.stringify(context.chatMessage);

        removeSensitiveContent(chatMessage);

        const lastMessageMessages = chatMessage.messages;
        const lastMessageMessageIndex = lastMessageMessages.findLastIndex(message => message.type !== 'reasoning');
        const lastMessageMessage = lastMessageMessages[lastMessageMessageIndex];
        context.patternExtractor.setState(lastMessageMessage.type === 'schema-card' ? 'handling' : 'normal');
        context.partialSchemaJsonIndex = lastMessageMessage.type === 'schema-card' ? lastMessageMessageIndex : -1;
      
      }
    }
  };
}