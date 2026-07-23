import { ref, shallowRef, computed } from 'vue';
import {
  indexedDBStorageStrategyFactory,
  useConversation,
  type ChatMessage,
  type UseMessageOptions,
} from '@opentiny/tiny-robot-kit';
import type { IMessageManagerBridge, ImportConversationItem } from '@opentiny/genui-sdk-vue';
import { collectConversationsForExport } from '@opentiny/genui-sdk-vue';
import type { LLMConfig } from '../chat.types';
import {
  findLatestSchemaInConversation,
  repairAllStalePendingSchemaCards,
  normalizeManualSchemaSaveMessages,
} from '../template-chat-utils';
import { t } from '../../../i18n';
import { createTemplateResponseProvider } from '../createTemplateResponseProvider';
import { createTemplateStreamHandlerOptions } from '../templateStreamHandler';

export type TemplateConversationHandle = ReturnType<typeof useConversation>;

export interface UseTemplateConversationOptions {
  url: string;
  llmConfig?: LLMConfig;
  onLoaded?: (messages: ChatMessage[] | undefined) => void;
}

const conversationRef = shallowRef<TemplateConversationHandle | null>(null);
const storageRef = shallowRef<ReturnType<typeof indexedDBStorageStrategyFactory> | null>(null);
const inputMessage = ref('');
const loading = ref(true);
const isTemplateInit = ref(false);

let templateChatUrl = '';
let templateLlmConfig: LLMConfig = { model: '', temperature: 0.3 };
let templateSchema: unknown = null;
let onLoadedCallback: ((messages: ChatMessage[] | undefined) => void) | undefined;

function createEmptyMessageManager(): IMessageManagerBridge {
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

function createMessageManagerBridge(conversation: TemplateConversationHandle): IMessageManagerBridge {
  const engine = conversation.activeConversation.value?.engine;
  if (!engine) {
    return createEmptyMessageManager();
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
}

function getActiveMessages(): ChatMessage[] {
  return conversationRef.value?.activeConversation.value?.engine.messages.value ?? [];
}

async function runPostLoadHooks(messages: ChatMessage[] | undefined) {
  repairAllStalePendingSchemaCards(messages);
  normalizeManualSchemaSaveMessages(messages);
  onLoadedCallback?.(messages);
}

export function useTemplateConversation(options?: UseTemplateConversationOptions) {
  if (!conversationRef.value && options?.url) {
    const { url, llmConfig, onLoaded } = options;
    templateChatUrl = url;
    templateLlmConfig = llmConfig || templateLlmConfig;
    onLoadedCallback = onLoaded;

    const streamHandler = createTemplateStreamHandlerOptions();
    const storage = indexedDBStorageStrategyFactory({
      dbName: 'genui-ai-template-v2',
    });
    storageRef.value = storage;

    const useMessageOptions: UseMessageOptions = {
      responseProvider: createTemplateResponseProvider(() => ({
        getUrl: () => templateChatUrl,
        getLlmConfig: () => templateLlmConfig,
        getTemplateSchema: () => templateSchema,
      })),
      plugins: [
        { name: 'thinking', disabled: true },
        { name: 'length', disabled: true },
        {
          name: 'template-stream-lifecycle',
          onTurnEnd: (context) => {
            streamHandler.onTurnEnd(context);
            repairAllStalePendingSchemaCards(getActiveMessages());
          },
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
          void runPostLoadHooks([]);
          return;
        }
        if (!conversation.activeConversationId.value) {
          void conversation.switchConversation(list[0].id).then(() => {
            void runPostLoadHooks(getActiveMessages());
          });
          return;
        }
        void runPostLoadHooks(getActiveMessages());
      },
    });

    conversationRef.value = conversation;
    isTemplateInit.value = true;
  }

  const conversation = computed(() => conversationRef.value);
  const messages = computed(() => getActiveMessages());
  const messageManager = computed(() => {
    if (!conversationRef.value) {
      return createEmptyMessageManager();
    }
    return createMessageManagerBridge(conversationRef.value);
  });

  const templateConversationState = computed(() => ({
    conversations: conversationRef.value?.conversations.value ?? [],
    currentId: conversationRef.value?.activeConversationId.value ?? null,
    loading: loading.value,
  }));

  const currentConversationId = computed(() => conversationRef.value?.activeConversationId.value ?? null);

  const templateSchemaList = computed(() => {
    if (!conversationRef.value) {
      return [];
    }
    return conversationRef.value.conversations.value.map((item) => {
      const metadataSchema = item.metadata?.lastSchema;
      if (typeof metadataSchema === 'string' && metadataSchema) {
        return {
          id: item.id,
          name: item.title,
          schema: metadataSchema,
        };
      }
      if (item.id === conversationRef.value?.activeConversationId.value) {
        const schemaInfo = findLatestSchemaInConversation(getActiveMessages());
        return {
          id: item.id,
          name: item.title,
          schema: schemaInfo?.schema ?? '',
        };
      }
      return {
        id: item.id,
        name: item.title,
        schema: '',
      };
    });
  });

  function getTemplateChatBaseConfig() {
    return {
      url: templateChatUrl,
      llmConfig: templateLlmConfig,
    };
  }

  function changeLlmConfig(llmConfig: LLMConfig) {
    templateLlmConfig = llmConfig;
  }

  function saveConversations() {}

  function createConversation() {
    if (!conversationRef.value) {
      return;
    }
    conversationRef.value.createConversation({ title: t('template.defaultTitle') });
  }

  async function switchConversation(id: string) {
    if (!conversationRef.value) {
      return;
    }
    await conversationRef.value.switchConversation(id);
  }

  function deleteConversation(id: string) {
    if (!conversationRef.value) {
      return false;
    }
    void conversationRef.value.deleteConversation(id);
    return conversationRef.value.conversations.value.length === 0;
  }

  function updateConversationTitle(id: string, title: string) {
    conversationRef.value?.updateConversationTitle(id, title);
  }

  function getMessageManager() {
    return messageManager.value;
  }

  function getCurrentConversation() {
    const kit = conversationRef.value;
    const currentId = kit?.activeConversationId.value;
    if (!kit || !currentId) {
      return null;
    }
    const info = kit.conversations.value.find((item) => item.id === currentId);
    return {
      id: currentId,
      title: kit.activeConversation.value?.title ?? info?.title,
      messages: getActiveMessages(),
      createdAt: info?.createdAt ?? Date.now(),
      updatedAt: info?.updatedAt ?? Date.now(),
    };
  }

  function setTemplateSchema(schema: unknown) {
    templateSchema = schema;
  }

  async function importConversations(items: ImportConversationItem[]) {
    const kit = conversationRef.value;
    if (!kit) {
      return;
    }
    for (const item of items) {
      const created = kit.createConversation({
        id: item.id,
        title: item.title || t('template.defaultTitle'),
        metadata: item.metadata,
      });
      await kit.switchConversation(created.id);
      const engine = kit.activeConversation.value?.engine;
      if (engine && item.messages?.length) {
        engine.messages.value.splice(0, engine.messages.value.length, ...item.messages);
      }
    }
  }

  async function exportConversations(ids?: string[]) {
    const kit = conversationRef.value;
    const storage = storageRef.value;
    if (!kit || !storage) {
      return [];
    }
    return collectConversationsForExport(kit, storage, ids);
  }

  function updateConversationLastSchema(schema: unknown) {
    const kit = conversationRef.value;
    const storage = storageRef.value;
    const currentId = kit?.activeConversationId.value;
    if (!kit || !storage || !currentId || schema == null) {
      return;
    }
    const current = kit.conversations.value.find((item) => item.id === currentId);
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
  }

  return {
    isTemplateInit,
    conversation,
    conversationKit: conversationRef,
    messages,
    messageManager,
    templateConversationState,
    currentConversationId,
    templateSchemaList,
    getTemplateChatBaseConfig,
    changeLlmConfig,
    saveConversations,
    createConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
    getMessageManager,
    getCurrentConversation,
    setTemplateSchema,
    importConversations,
    exportConversations,
    updateConversationLastSchema,
  };
}
