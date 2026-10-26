import {
  IndexedDBStrategy,
  type ChatMessage,
  type ConversationInfo,
  type ConversationStorageStrategy,
} from '@opentiny/tiny-robot-kit';
import type { Ref } from 'vue';

export const GENUI_CONVERSATION_DB_NAME = 'genui-ai-v1';
export const GENUI_TEMPLATE_CONVERSATION_DB_NAME = 'genui-ai-template-v1';

export function createConversationStorage(
  dbName = GENUI_CONVERSATION_DB_NAME,
): ConversationStorageStrategy {
  return new IndexedDBStrategy(dbName);
}

export function createToggleableConversationStorage(
  storage: ConversationStorageStrategy,
  enabled: Ref<boolean>,
): ConversationStorageStrategy {
  return {
    loadConversations: () => storage.loadConversations(),
    loadMessages: (conversationId) => storage.loadMessages(conversationId),
    saveConversation: (conversation: ConversationInfo) =>
      enabled.value ? storage.saveConversation(conversation) : undefined,
    saveMessages: (conversationId: string, messages: ChatMessage[]) =>
      enabled.value ? storage.saveMessages(conversationId, messages) : undefined,
    deleteConversation: (conversationId) =>
      enabled.value ? storage.deleteConversation?.(conversationId) : undefined,
  };
}

export async function flushConversationStorage(
  storage: ConversationStorageStrategy,
  conversations: ConversationInfo[],
  active?: { id: string; messages: ChatMessage[] } | null,
) {
  const persisted = await storage.loadConversations();
  const currentIds = new Set(conversations.map((conversation) => conversation.id));
  await Promise.all(
    persisted
      .filter((conversation) => !currentIds.has(conversation.id))
      .map((conversation) => storage.deleteConversation?.(conversation.id)),
  );
  await Promise.all(conversations.map((conversation) => storage.saveConversation(conversation)));
  if (active) {
    await storage.saveMessages(active.id, active.messages);
  }
}
