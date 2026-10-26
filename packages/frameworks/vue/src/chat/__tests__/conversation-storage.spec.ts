import { ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import type { ConversationStorageStrategy } from '@opentiny/tiny-robot-kit';
import {
  createConversationStorage,
  createToggleableConversationStorage,
  flushConversationStorage,
  GENUI_CONVERSATION_DB_NAME,
  GENUI_TEMPLATE_CONVERSATION_DB_NAME,
} from '../conversation-storage';

const conversation = {
  id: 'conversation-1',
  title: 'Conversation',
  createdAt: 1,
  updatedAt: 1,
};
const messages = [{ role: 'user', content: 'hello' }];

describe('toggleable conversation storage', () => {
  it('keeps reads enabled and gates every persistence mutation', async () => {
    const base: ConversationStorageStrategy = {
      loadConversations: vi.fn().mockResolvedValue([conversation]),
      loadMessages: vi.fn().mockResolvedValue(messages),
      saveConversation: vi.fn(),
      saveMessages: vi.fn(),
      deleteConversation: vi.fn(),
    };
    const enabled = ref(false);
    const storage = createToggleableConversationStorage(base, enabled);

    await storage.loadConversations();
    await storage.loadMessages(conversation.id);
    await storage.saveConversation(conversation);
    await storage.saveMessages(conversation.id, messages);
    await storage.deleteConversation?.(conversation.id);

    expect(base.loadConversations).toHaveBeenCalledOnce();
    expect(base.loadMessages).toHaveBeenCalledOnce();
    expect(base.saveConversation).not.toHaveBeenCalled();
    expect(base.saveMessages).not.toHaveBeenCalled();
    expect(base.deleteConversation).not.toHaveBeenCalled();

    enabled.value = true;
    await storage.saveConversation(conversation);
    await storage.saveMessages(conversation.id, messages);
    await storage.deleteConversation?.(conversation.id);

    expect(base.saveConversation).toHaveBeenCalledOnce();
    expect(base.saveMessages).toHaveBeenCalledOnce();
    expect(base.deleteConversation).toHaveBeenCalledOnce();
  });

  it('flushes metadata and active messages after auto-save is re-enabled', async () => {
    const base: ConversationStorageStrategy = {
      loadConversations: vi.fn().mockResolvedValue([
        conversation,
        { ...conversation, id: 'removed-conversation' },
      ]),
      loadMessages: vi.fn().mockResolvedValue([]),
      saveConversation: vi.fn(),
      saveMessages: vi.fn(),
      deleteConversation: vi.fn(),
    };

    await flushConversationStorage(base, [conversation], { id: conversation.id, messages });

    expect(base.saveConversation).toHaveBeenCalledWith(conversation);
    expect(base.saveMessages).toHaveBeenCalledWith(conversation.id, messages);
    expect(base.deleteConversation).toHaveBeenCalledWith('removed-conversation');
  });

  it('uses isolated v1 database names and never exposes a business saveConversations API', () => {
    expect(GENUI_CONVERSATION_DB_NAME).toBe('genui-ai-v1');
    expect(GENUI_TEMPLATE_CONVERSATION_DB_NAME).toBe('genui-ai-template-v1');
    expect(createConversationStorage()).toBeDefined();
    expect('saveConversations' in createConversationStorage()).toBe(false);
  });

  it('persists create, switch and delete only while auto-save is enabled', async () => {
    const conversations = [conversation];
    const messagesById = new Map([[conversation.id, messages]]);
    const base: ConversationStorageStrategy = {
      loadConversations: vi.fn(async () => conversations.slice()),
      loadMessages: vi.fn(async (id) => messagesById.get(id) ?? []),
      saveConversation: vi.fn(async (item) => {
        const index = conversations.findIndex((current) => current.id === item.id);
        if (index >= 0) conversations[index] = item;
        else conversations.push(item);
      }),
      saveMessages: vi.fn(async (id, nextMessages) => {
        messagesById.set(id, nextMessages);
      }),
      deleteConversation: vi.fn(async (id) => {
        const index = conversations.findIndex((current) => current.id === id);
        if (index >= 0) conversations.splice(index, 1);
        messagesById.delete(id);
      }),
    };
    const enabled = ref(true);
    const storage = createToggleableConversationStorage(base, enabled);
    const created = { ...conversation, id: 'conversation-2', title: 'Created' };

    await storage.saveConversation(created);
    await storage.saveMessages(created.id, messages);
    expect(await storage.loadMessages(created.id)).toEqual(messages);

    await storage.deleteConversation?.(created.id);
    expect(base.deleteConversation).toHaveBeenCalledWith(created.id);

    enabled.value = false;
    await storage.saveConversation(created);
    await storage.saveMessages(created.id, messages);
    await storage.deleteConversation?.(conversation.id);
    expect(base.saveConversation).toHaveBeenCalledTimes(1);
    expect(base.saveMessages).toHaveBeenCalledTimes(1);
    expect(base.deleteConversation).toHaveBeenCalledTimes(1);

    enabled.value = true;
    await flushConversationStorage(base, [conversation], { id: conversation.id, messages });
    expect(base.saveConversation).toHaveBeenCalledWith(conversation);
  });
});
