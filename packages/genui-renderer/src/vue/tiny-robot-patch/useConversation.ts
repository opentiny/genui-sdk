/**
 * useConversation composable
 * 提供会话管理和持久化功能
 */

import { computed, reactive, watch, type ComputedRef } from 'vue';
import type { ChatMessage, ConversationState, Conversation, UseConversationOptions } from '@opentiny/tiny-robot-kit';
import { MessageManager } from './messageManager';
import { useMessage, type UseMessageReturn } from './useMessage';
import { IndexedDBStrategy } from './indexedDBStrategy';
import { useI18n } from '../i18n';

/**
 * useConversation返回值接口
 */
export interface UseConversationReturn {
  /** 会话状态 */
  state: ConversationState;
  /** 消息管理 */
  messageManager: ComputedRef<UseMessageReturn>;
  /** 创建新会话 */
  createConversation: (title?: string, metadata?: Record<string, unknown>) => string;
  /** 切换会话 */
  switchConversation: (id: string) => void;
  /** 删除会话 */
  deleteConversation: (id: string) => void;
  /** 更新会话标题 */
  updateTitle: (id: string, title: string) => void;
  /** 更新会话元数据 */
  updateMetadata: (id: string, metadata: Record<string, unknown>) => void;
  /** 保存会话 */
  saveConversations: () => Promise<void>;
  /** 加载会话 */
  loadConversations: () => Promise<void>;
  /** 生成会话标题 */
  generateTitle: (id: string) => Promise<string>;
  /** 获取当前会话 */
  getCurrentConversation: () => Conversation | null;
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

/**
 * useConversation composable
 * 提供会话管理和持久化功能
 *
 * @param options useConversation选项
 * @returns UseConversationReturn
 */
export function useConversation(options: UseConversationOptions): UseConversationReturn {
  const { t } = useI18n();
  const {
    client,
    storage = new IndexedDBStrategy(),
    autoSave = true,
    allowEmpty = false,
    useStreamByDefault = true,
    errorMessage: errorMessageOption,
    events,
  } = options;
  
  const errorMessage = errorMessageOption || t('message.requestFailed');

  // 会话状态
  const state = reactive<ConversationState>({
    conversations: [],
    currentId: null,
    loading: false,
  });

  // 标记是否已经触发过 onLoaded 回调
  let hasTriggeredOnLoaded = false;

  const messageManager = new MessageManager(state, {
    client,
    useStreamByDefault,
    conversationId: '',
    errorMessage,
    initialMessages: [],
    events: {
      onReceiveData: events?.onReceiveData,
      onFinish: events?.onFinish,
    },
  });

  const currentMessageManager = computed<UseMessageReturn>(() => {
    if (state.currentId) {
      return messageManager.getMessageManager(state.currentId);
    }
      return useMessage({
      client,
      useStreamByDefault,
      conversationId: '',
      errorMessage,
      initialMessages: [],
      events: {
        onReceiveData: events?.onReceiveData,
        onFinish: events?.onFinish,
      },
    });
  });
  watch(
    () => currentMessageManager.value,
    () => {
      messageManager.messageManagerMap.forEach((messageManager) => {
        const messages = messageManager.messages.value;
        if (state.currentId && messages.length > 0) {
          const index = state.conversations.findIndex((row: Conversation) => row.id === messageManager.conversationId);
          if (index !== -1) {
            state.conversations[index].messages = [...messages];
            state.conversations[index].updatedAt = Date.now();
            if (autoSave) {
              saveConversations();
            }
          }
        }
      });
    },
    { deep: true },
  );

  /**
   * 创建新会话
   */
  const createConversation = (title?: string, metadata: Record<string, unknown> = {}): string => {
    const defaultTitle = title || t('conversation.newConversation');
    // 空会话则不再创建新会话
    if (!allowEmpty && currentMessageManager.value.messages.value.length === 0 && state.currentId) {
      return state.currentId;
    }

    const id = generateId();
    const newConversation: Conversation = {
      id,
      title: defaultTitle,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      metadata,
    };

    state.conversations.unshift(newConversation);
    messageManager.setMessageManager(id, { ...options, conversationId: id });
    switchConversation(id);

    if (autoSave) {
      saveConversations();
    }

    return id;
  };

  /**
   * 切换会话
   */
  const switchConversation = (id: string): void => {
    const conversation = state.conversations.find((conv: Conversation) => conv.id === id);
    if (conversation) {
      state.currentId = id;
      messageManager.setMessageManager(id, { ...options, initialMessages: conversation.messages, conversationId: id });
    }
  };

  /**
   * 删除会话
   */
  const deleteConversation = (id: string): void => {
    const index = state.conversations.findIndex((conv: Conversation) => conv.id === id);
    if (index !== -1) {
      messageManager.deleteMessageManager(id);
      state.conversations.splice(index, 1);

      // 如果删除的是当前会话，切换到第一个会话或清空
      if (state.currentId === id) {
        if (state.conversations.length > 0) {
          switchConversation(state.conversations[0].id);
        } else {
          state.currentId = null;
        }
      }

      if (autoSave) {
        saveConversations();
      }
    }
  };

  /**
   * 更新会话标题
   */
  const updateTitle = (id: string, title: string): void => {
    const conversation = state.conversations.find((conv: Conversation) => conv.id === id);
    if (conversation) {
      conversation.title = title;
      conversation.updatedAt = Date.now();

      if (autoSave) {
        saveConversations();
      }
    }
  };

  /**
   * 更新会话元数据
   */
  const updateMetadata = (id: string, metadata: Record<string, unknown>): void => {
    const conversation = state.conversations.find((conv: Conversation) => conv.id === id);
    if (conversation) {
      conversation.metadata = { ...conversation.metadata, ...metadata };
      conversation.updatedAt = Date.now();

      if (autoSave) {
        saveConversations();
      }
    }
  };

  /**
   * 保存会话
   */
  const saveConversations = async (): Promise<void> => {
    try {
      await storage.saveConversations(state.conversations);
    } catch (error) {
      console.error('保存会话失败:', error);
    }
  };

  /**
   * 加载会话
   */
  const loadConversations = async (): Promise<void> => {
    state.loading = true;
    try {
      const conversations = await storage.loadConversations();
      state.conversations = conversations;

      // 如果有会话，默认选中第一个
      if (conversations.length > 0 && !state.currentId) {
        switchConversation(conversations[0].id);
      }

      // 仅在第一次加载完成后触发 onLoaded 回调
      if (!hasTriggeredOnLoaded && events?.onLoaded) {
        hasTriggeredOnLoaded = true;
        events.onLoaded(conversations);
      }
    } catch (error) {
      console.error('加载会话失败:', error);
    } finally {
      state.loading = false;
    }
  };

  /**
   * 生成会话标题
   * 基于会话内容自动生成标题
   */
  const generateTitle = async (id: string): Promise<string> => {
    const conversation = state.conversations.find((conv: Conversation) => conv.id === id);
    if (!conversation || conversation.messages.length < 2) {
      return conversation?.title || t('conversation.newConversation');
    }

    try {
      // 构建生成标题的提示
      const prompt: ChatMessage = {
        role: 'system',
        content:
          '请根据以下对话内容，生成一个简短的标题（不超过20个字符）。只需要返回标题文本，不需要任何解释或额外内容。',
      };

      // 获取前几条消息用于生成标题
      const contextMessages = conversation.messages.slice(0, Math.min(4, conversation.messages.length));

      const response = await client.chat({
        messages: [prompt, ...contextMessages],
        options: {
          stream: false,
          max_tokens: 30,
        },
      });

      const title = response.choices[0].message.content.trim();
      updateTitle(id, title);
      return title;
    } catch (error) {
      console.error('生成标题失败:', error);
      return conversation.title;
    }
  };

  /**
   * 获取当前会话
   */
  const getCurrentConversation = (): Conversation | null => {
    if (!state.currentId) return null;
    return state.conversations.find((conv: Conversation) => conv.id === state.currentId) || null;
  };

  // 初始加载会话
  loadConversations();

  return {
    state,
    messageManager: currentMessageManager,
    createConversation,
    switchConversation,
    deleteConversation,
    updateTitle,
    updateMetadata,
    saveConversations,
    loadConversations,
    generateTitle,
    getCurrentConversation,
  };
}
