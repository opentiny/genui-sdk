import { computed, reactive, ref, watch, type ComputedRef, type Ref } from 'vue';
import {
  indexedDBStorageStrategyFactory,
  useConversation,
  type ChatMessage,
  type UseMessageOptions,
} from '@opentiny/tiny-robot-kit';
import type { IMessageManagerBridge } from '@opentiny/genui-sdk-vue';
import { t } from '../../i18n';
import type { LLMConfig } from '../genui-template/chat.types';
import { createTemplateResponseProvider } from './createTemplateResponseProvider';
import { createTemplateStreamHandlerOptions } from './templateStreamHandler';

export interface LegacyTemplateConversationState {
  conversations: Array<{
    id: string;
    title?: string;
    createdAt?: number;
    updatedAt?: number;
    metadata?: Record<string, unknown>;
    messages?: ChatMessage[];
  }>;
  currentId: string | null;
  loading: boolean;
}

export interface LegacyMessageManager extends IMessageManagerBridge {
  messages: Ref<ChatMessage[]>;
  messageState: { status: string };
  isProcessing: ComputedRef<boolean>;
  inputMessage: Ref<string>;
  send: () => Promise<void>;
  abortRequest: () => Promise<void>;
  addMessage: (message: ChatMessage | ChatMessage[]) => void;
}

export interface LegacyTemplateConversation {
  state: LegacyTemplateConversationState;
  messageManager: ComputedRef<LegacyMessageManager>;
  createConversation: (title?: string) => string;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  updateTitle: (id: string, title: string) => void;
  saveConversations: () => Promise<void>;
  getCurrentConversation: () => { messages: ChatMessage[] } | null;
  importConversations: (
    items: Array<{ id: string; title?: string; messages?: ChatMessage[]; metadata?: Record<string, unknown> }>,
  ) => Promise<void>;
}

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
    dbName: 'genui-ai-template',
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

  const state = reactive<LegacyTemplateConversationState>({
    conversations: [],
    currentId: null,
    loading: true,
  });

  watch(
    conversation.conversations,
    (value) => {
      state.conversations = value.map((item) => ({ ...item }));
    },
    { immediate: true, deep: true },
  );

  watch(
    conversation.activeConversationId,
    (value) => {
      state.currentId = value;
    },
    { immediate: true },
  );

  watch(loading, (value) => {
    state.loading = value;
  }, { immediate: true });

  const createConversationCompat = (title?: string) => {
    const created = conversation.createConversation({
      title: title || t('template.defaultTitle'),
    });
    return created.id;
  };

  const messageManager = computed<LegacyMessageManager>(() => {
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
          engine.messages.value.push(message);
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
    const stateItem = state.conversations.find((item) => item.id === currentId);
    if (stateItem) {
      stateItem.metadata = {
        ...stateItem.metadata,
        lastSchema: JSON.stringify(schema),
      };
    }
  };

  const legacyConversation: LegacyTemplateConversation = {
    state,
    messageManager,
    createConversation: createConversationCompat,
    switchConversation: (id: string) => {
      void conversation.switchConversation(id);
    },
    deleteConversation: (id: string) => {
      void conversation.deleteConversation(id);
    },
    updateTitle: (id: string, title: string) => {
      conversation.updateConversationTitle(id, title);
    },
    saveConversations: async () => {
      conversation.saveMessages();
    },
    getCurrentConversation: () => {
      const active = conversation.activeConversation.value;
      if (!active) {
        return null;
      }
      return { messages: active.engine.messages.value };
    },
    importConversations: async (items) => {
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
          conversation.saveMessages();
        }
      }
    },
  };

  return {
    conversation,
    legacyConversation,
    inputMessage,
    messageManager,
    loading,
    updateConversationLastSchema,
    createConversation: createConversationCompat,
  };
}
