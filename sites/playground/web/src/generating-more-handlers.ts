import { OverlapEliminator } from "./components/overlap-eliminator";

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
      context.overlapEliminated = false;
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

    start: (context, handlers) => {
      const messages = messageManager.value.messages;
      const latestMessage = messages.value[messages.value.length - 2];
      messages.value = messages.value.slice(0, messages.value.length - 1);
      if (latestMessage.requireMore) {
        context.chatMessage = latestMessage;
        delete context.chatMessage.requireMore;
        context.chatMessage.originChatMessage = JSON.stringify(context.chatMessage);
        context.patternExtractor.setState(latestMessage?.type === 'markdown' ? 'normal' : 'handling');
        return true;
      }
      return false;
    }
  };
}