import { ref, shallowRef, watch } from 'vue';
import {
  indexedDBStorageStrategyFactory,
  useConversation,
  type ChatMessage,
  type UseMessageOptions,
} from '@opentiny/tiny-robot-kit';
import type { IResponseHandler } from './response-handler';
import { defaultResponseHandlers } from './response-handler';
import type { IStreamData } from '@opentiny/genui-sdk-core';
import { useI18n } from './i18n';
import { createGenuiResponseProvider } from './createGenuiResponseProvider';
import { createGenuiStreamHandlerOptions } from './genuiStreamHandler';
import type { GenuiChatRuntimeOptions } from './types';
import type { IMessage, IMessageManagerBridge } from './chat.types';
import { collectConversationsForExport, type ExportConversationItem } from './collectConversationsForExport';
import { createMessageManagerBridge } from './createMessageManagerBridge';

export type { ExportConversationItem };

export type GenuiConversationHandle = ReturnType<typeof useConversation>;

export interface ImportConversationItem {
  id: string;
  title?: string;
  messages?: ChatMessage[];
  metadata?: Record<string, unknown>;
}

export interface UseGenuiConversationOptions {
  getRuntimeOptions: () => GenuiChatRuntimeOptions;
  initialMessages?: IMessage[];
  dbName?: string;
  getResponseHandlers?: () => IResponseHandler<IStreamData>[];
}

export function useGenuiConversation(options: UseGenuiConversationOptions) {
  const { t } = useI18n();
  const inputMessage = ref('');
  const loading = ref(true);
  const responseHandlers = ref<IResponseHandler<IStreamData>[]>(defaultResponseHandlers);
  const messageManager = shallowRef<IMessageManagerBridge | null>(null);

  const streamHandler = createGenuiStreamHandlerOptions({
    getChatConfig: () => options.getRuntimeOptions().chatConfig,
    getResponseHandlers: () => options.getResponseHandlers?.() ?? responseHandlers.value,
  });

  const storage = indexedDBStorageStrategyFactory({
    dbName: options.dbName ?? 'genui-ai-v2',
  });

  const useMessageOptions: UseMessageOptions = {
    responseProvider: createGenuiResponseProvider(() => options.getRuntimeOptions()),
    plugins: [
      { name: 'thinking', disabled: true },
      { name: 'length', disabled: true },
      {
        name: 'genui-stream-lifecycle',
        onTurnEnd(context) {
          streamHandler.onTurnEnd(context);
        },
        onError(context) {
          streamHandler.onError(context);
        },
      },
    ],
    onCompletionChunk: streamHandler.onCompletionChunk,
  };

  const conversation = useConversation({
    useMessageOptions,
    storage,
    autoSaveMessages: true,
    autoSaveThrottle: 1000,
    onLoad(list) {
      if (!list.length) {
        conversation.createConversation({ title: t('conversation.newConversation') });
        loading.value = false;
        return;
      }
      if (!conversation.activeConversationId.value) {
        void conversation.switchConversation(list[0].id).finally(() => {
          loading.value = false;
        });
        return;
      }
      loading.value = false;
    },
  });

  const createConversation = (title?: string, metadata?: Record<string, unknown>) => {
    const created = conversation.createConversation({
      title: title || t('conversation.newConversation'),
      metadata,
    });
    return created.id;
  };

  const isBlankActiveConversation = () => {
    const active = conversation.activeConversation.value;
    if (!active) {
      return false;
    }
    return (active.engine?.messages.value.length ?? 0) === 0;
  };

  const handleNewConversation = () => {
    if (isBlankActiveConversation()) {
      return conversation.activeConversationId.value;
    }
    return createConversation();
  };

  const importConversations = async (items: ImportConversationItem[]) => {
    const previousActiveId = conversation.activeConversationId.value;
    for (const item of items) {
      const created = conversation.createConversation({
        id: item.id,
        title: item.title || t('conversation.newConversation'),
        metadata: item.metadata,
      });
      await conversation.switchConversation(created.id);
      const engine = conversation.activeConversation.value?.engine;
      if (engine && item.messages?.length) {
        engine.messages.value.splice(0, engine.messages.value.length, ...item.messages);
      }
    }
    if (previousActiveId) {
      await conversation.switchConversation(previousActiveId);
    }
  };

  const exportConversations = async (ids?: string[]) => collectConversationsForExport(conversation, storage, ids);

  const ensureActiveConversation = async () => {
    if (conversation.activeConversation.value?.engine) {
      return;
    }
    const list = conversation.conversations.value;
    if (list.length > 0) {
      await conversation.switchConversation(list[0].id);
      return;
    }
    createConversation();
  };

  const sendUserMessage = async (content: string, clearInput = true) => {
    const messageContent = content?.trim();
    if (!messageContent) {
      return;
    }
    await ensureActiveConversation();
    const engine = conversation.activeConversation.value?.engine;
    if (!engine) {
      return;
    }
    if (clearInput) {
      inputMessage.value = '';
    }
    await engine.sendMessage(messageContent);
  };

  const sendUserChatMessage = async (message: ChatMessage, clearInput = true) => {
    await ensureActiveConversation();
    const engine = conversation.activeConversation.value?.engine;
    if (!engine) {
      return;
    }
    if (clearInput) {
      inputMessage.value = '';
    }
    await engine.send(message);
  };

  watch(
    () => conversation.activeConversation.value?.engine,
    (engine) => {
      if (!engine) {
        messageManager.value = null;
        return;
      }
      messageManager.value = createMessageManagerBridge({
        engine,
        inputMessage,
        onSendText: sendUserMessage,
      });
    },
    { immediate: true },
  );

  const applyInitialMessages = (messages?: IMessage[]) => {
    if (!messages?.length) {
      return;
    }
    const engine = conversation.activeConversation.value?.engine;
    if (engine) {
      engine.messages.value.splice(0, engine.messages.value.length, ...(messages as ChatMessage[]));
    }
  };

  watch(
    () => options.initialMessages,
    (messages) => {
      if (messages?.length && !loading.value) {
        applyInitialMessages(messages);
      }
    },
    { immediate: true },
  );

  watch(loading, (isLoading) => {
    if (!isLoading) {
      applyInitialMessages(options.initialMessages);
    }
  });

  const setResponseHandlers = (handlers: IResponseHandler<IStreamData>[]) => {
    responseHandlers.value = handlers;
  };

  return {
    conversation,
    inputMessage,
    messageManager,
    loading,
    sendUserMessage,
    sendUserChatMessage,
    setResponseHandlers,
    getResponseHandlers: () => responseHandlers.value,
    createConversation,
    handleNewConversation,
    importConversations,
    exportConversations,
    setConversationTitle: (messageContent: string) => {
      const currentId = conversation.activeConversationId.value;
      if (!currentId) {
        return;
      }
      const current = conversation.conversations.value.find((item) => item.id === currentId);
      const defaultTitle = t('conversation.newConversation');
      if (current?.title === defaultTitle) {
        const contentStr = typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent);
        conversation.updateConversationTitle(currentId, contentStr.substring(0, 20));
      }
    },
  };
}
