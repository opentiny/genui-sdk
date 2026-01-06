import { type Reactive } from 'vue';
import type { ConversationState, Conversation } from '@opentiny/tiny-robot-kit';
import { useMessage, type UseMessageOptions, type UseMessageReturn } from './useMessage';

export class MessageManager {
  messageManagerMap: Map<string, UseMessageReturn> = new Map();
  conversationState: Reactive<ConversationState>;
  options: UseMessageOptions;
  constructor(conversationState: Reactive<ConversationState>, options: UseMessageOptions) {
    this.messageManagerMap = new Map();
    this.conversationState = conversationState;
    this.options = options;
  }

  getMessageManager(conversationId: string): UseMessageReturn {
    const messageManager = this.messageManagerMap.get(conversationId);
    if (messageManager) {
      return messageManager;
    }
    const conversation = this.conversationState.conversations.find(
      (conversation: Conversation) => conversation.id === conversationId,
    );
    if (!conversation) {
      throw new Error(`Conversation not found for id: ${conversationId}`);
    }

    return this.setMessageManager(conversationId);
  }
  setMessageManager(id: string, options?: UseMessageOptions): UseMessageReturn {
    if (this.messageManagerMap.has(id)) {
      return this.messageManagerMap.get(id)!;
    }

    const newMessageManager = useMessage(options ?? { ...this.options, conversationId: id });
    this.messageManagerMap.set(id, newMessageManager);
    return newMessageManager;
  }
  
  deleteMessageManager(id: string) {
    this.messageManagerMap.delete(id);
  }
}
