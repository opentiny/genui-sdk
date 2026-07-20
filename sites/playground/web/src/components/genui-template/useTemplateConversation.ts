import { computed, ref, watch } from 'vue';
import {
  indexedDBStorageStrategyFactory,
  useConversation,
  type ChatMessage,
  type UseMessageOptions,
} from '@opentiny/tiny-robot-kit';
import type { IMessageManagerBridge, ImportConversationItem } from '@opentiny/genui-sdk-vue';
import { collectConversationsForExport } from '@opentiny/genui-sdk-vue';
import { t } from '../../i18n';
import type { LLMConfig } from './chat.types';
import { createTemplateResponseProvider } from './createTemplateResponseProvider';
import { createTemplateStreamHandlerOptions } from './templateStreamHandler';

export type TemplateConversationHandle = ReturnType<typeof useConversation>;

export interface UseTemplateConversationOptions {
  getUrl: () => string;
  getLlmConfig: () => LLMConfig;
  getTemplateSchema: () => unknown;
}

export function useTemplateConversation(options: UseTemplateConversationOptions) {
  const inputMessage = ref('');
  const loading = ref(true);
  const streamHandler = createTemplateStreamHandlerOptions();

  const storage = indexedDBStorageStrategyFactory({
    dbName: 'genui-ai-template-v2',
  });

  const useMessageOptions: UseMessageOptions = {
    responseProvider: createTemplateResponseProvider(() => ({
      getUrl: options.getUrl,
      getLlmConfig: options.getLlmConfig,
      getTemplateSchema: options.getTemplateSchema,
    })),
    plugins: [
      { name: 'thinking', disabled: true },
      { name: 'length', disabled: true },
      {
        name: 'template-stream-lifecycle',
        onTurnEnd: streamHandler.onTurnEnd,
        onError: streamHandler.onError,
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
      loading.value = false;
      if (!list.length) {
        conversation.createConversation({ title: t('template.defaultTitle') });
      } else if (!conversation.activeConversationId.value) {
        void conversation.switchConversation(list[0].id);
      }
    },
  });

  const createConversation = (title?: string) => {
    const created = conversation.createConversation({
      title: title || t('template.defaultTitle'),
    });
    return created.id;
  };

  const importConversations = async (items: ImportConversationItem[]) => {
    for (const item of items) {
      const created = conversation.createConversation({
        id: item.id,
        title: item.title || t('template.defaultTitle'),
        metadata: item.metadata,
      });
      await conversation.switchConversation(created.id);
      const engine = conversation.activeConversation.value?.engine;
      if (engine && item.messages?.length) {
        engine.messages.value.splice(0, engine.messages.value.length, ...item.messages);
      }
    }
  };

  const messageManager = computed<IMessageManagerBridge>(() => {
    const engine = conversation.activeConversation.value?.engine;
    if (!engine) {
      return {
        messages: ref([]),
        messageState: { status: 'init' },
        isProcessing: computed(() => false),
        inputMessage,
        send: async () => {},
        abortRequest: async () => {},
        addMessage: () => {},
      };
    }

    const mapRequestState = (requestState: string) => {
      if (engine.isProcessing.value) {
        return 'streaming';
      }
      return requestState === 'idle' ? 'init' : requestState;
    };

    return {
      messages: engine.messages,
      get messageState() {
        return { status: mapRequestState(engine.requestState.value) };
      },
      isProcessing: engine.isProcessing,
      inputMessage,
      send: async () => {
        await engine.send();
      },
      abortRequest: () => engine.abortRequest(),
      addMessage: (message) => {
        if (Array.isArray(message)) {
          engine.messages.value.push(...message);
        } else {
          engine.messages.value.push(message as ChatMessage);
        }
      },
    };
  });

  const updateConversationLastSchema = (schema: unknown) => {
    const currentId = conversation.activeConversationId.value;
    if (!currentId || schema == null) {
      return;
    }
    const current = conversation.conversations.value.find((item) => item.id === currentId);
    if (!current) {
      return;
    }
    void storage.saveConversation({
      ...current,
      metadata: {
        ...current.metadata,
        lastSchema: JSON.stringify(schema),
      },
    });
  };

  const exportConversations = async (ids?: string[]) =>
    collectConversationsForExport(conversation, storage, ids);

  return {
    conversation,
    inputMessage,
    messageManager,
    loading,
    updateConversationLastSchema,
    createConversation,
    importConversations,
    exportConversations,
  };
}
