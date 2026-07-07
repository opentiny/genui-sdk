import type { ChatMessage, ConversationStorageStrategy } from '@opentiny/tiny-robot-kit';
import type { GenuiConversationHandle } from './useGenuiConversation';

export interface ExportConversationItem {
  id: string;
  title?: string;
  createdAt: number;
  updatedAt: number;
  messages?: ChatMessage[];
  metadata?: Record<string, unknown>;
}

export async function collectConversationsForExport(
  conversation: GenuiConversationHandle,
  storage: ConversationStorageStrategy,
  ids?: string[],
): Promise<ExportConversationItem[]> {
  const list = conversation.conversations.value;
  const idSet = ids?.length ? new Set(ids) : null;
  const activeId = conversation.activeConversationId.value;
  const results: ExportConversationItem[] = [];

  for (const info of list) {
    if (idSet && !idSet.has(info.id)) {
      continue;
    }

    let messages = await storage.loadMessages(info.id);
    if (info.id === activeId) {
      const engine = conversation.activeConversation.value?.engine;
      if (engine) {
        messages = engine.messages.value;
      }
    }

    results.push({
      id: info.id,
      title: info.title,
      createdAt: info.createdAt,
      updatedAt: info.updatedAt,
      metadata: info.metadata,
      messages,
    });
  }

  return results;
}
