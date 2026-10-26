import { computed, ref, shallowRef, watch } from 'vue';
import {
  createResponseHandlerController,
  createResponseHandlerPlugin,
  createToggleableConversationStorage,
  createConversationStorage,
  flushConversationStorage,
  GENUI_TEMPLATE_CONVERSATION_DB_NAME,
  useConversation,
} from '@opentiny/genui-sdk-vue';
import type { ChatMessage, UseConversationReturn } from '@opentiny/tiny-robot-kit';
import { TemplateModelProvider } from '../template-provider';
import { emitter } from '../template-chat-event-emitter';
import type { LLMConfig } from '../chat.types';
import {
  findLatestSchemaInConversation,
  normalizeManualSchemaSaveMessages,
  normalizeTemplateUserSegments,
  repairAllStalePendingSchemaCards,
} from '../template-chat-utils';
import { t } from '../../../i18n';

const conversationKit = shallowRef<UseConversationReturn | null>(null);
const autoSaveMessages = ref(true);
let templateProvider: TemplateModelProvider | null = null;
let templateChatUrl = '';
let templateLlmConfig: LLMConfig = { model: '', temperature: 0.3 };
const isTemplateInit = ref(false);

export interface UseTemplateConversationOptions {
  url: string;
  llmConfig?: LLMConfig;
  onLoaded?: (messages: ChatMessage[] | undefined) => void;
}

function normalizeMessages(messages: ChatMessage[] | undefined) {
  if (!messages) return;
  repairAllStalePendingSchemaCards(messages);
  normalizeManualSchemaSaveMessages(messages);
  normalizeTemplateUserSegments(messages);
}

export function useTemplateConversation(options?: UseTemplateConversationOptions) {
  if (!conversationKit.value && options?.url) {
    const { url, llmConfig, onLoaded } = options;
    templateChatUrl = url;
    templateLlmConfig = llmConfig || templateLlmConfig;
    templateProvider = new TemplateModelProvider({
      url,
      llmConfig: templateLlmConfig,
      emitter,
    });

    const controller = createResponseHandlerController({
      getHandlers: () => templateProvider!.getResponseHandlers(),
      getChatConfig: () => ({}),
      getContext: () => templateProvider!.getResponseContext(),
    });
    const baseStorage = createConversationStorage(GENUI_TEMPLATE_CONVERSATION_DB_NAME);
    let kit!: UseConversationReturn;
    kit = useConversation({
      storage: createToggleableConversationStorage(baseStorage, autoSaveMessages),
      autoSaveMessages: true,
      useMessageOptions: {
        responseProvider: templateProvider.responseProvider,
        requestMessageFieldsExclude: ['state', 'metadata', 'loading', 'messages', 'finishInfo', 'originChatMessage'],
        plugins: [
          createResponseHandlerPlugin(controller),
          {
            name: 'template-finalize',
            onTurnEnd(context) {
              normalizeMessages(context.messages);
            },
          },
        ],
        onCompletionChunk(context) {
          controller.handleChunk(context.turnId, context.currentMessage, context.chunk as any);
        },
      },
      onLoad(conversations) {
        queueMicrotask(async () => {
          if (conversations.length) {
            await kit.switchConversation(conversations[0].id);
          } else {
            kit.createConversation({ title: t('template.defaultTitle') });
          }
          normalizeMessages(kit.activeConversation.value?.engine.messages.value);
          onLoaded?.(kit.activeConversation.value?.engine.messages.value);
        });
      },
    });
    watch(autoSaveMessages, async (enabled, previous) => {
      if (!enabled || previous !== false) return;
      const active = kit.activeConversation.value;
      await flushConversationStorage(
        baseStorage,
        kit.conversations.value,
        active ? { id: active.id, messages: active.engine.messages.value } : null,
      );
    });
    conversationKit.value = kit;
    isTemplateInit.value = true;
  }

  const messages = computed(() => conversationKit.value?.activeConversation.value?.engine.messages.value ?? []);
  const templateConversationState = computed(() => ({
    conversations: conversationKit.value?.conversations.value ?? [],
    currentId: conversationKit.value?.activeConversationId.value ?? null,
    loading: false,
  }));
  const currentConversationId = computed(() => conversationKit.value?.activeConversationId.value ?? null);
  const templateSchemaList = computed(() =>
    (conversationKit.value?.conversations.value ?? []).map((item) => {
      const active = conversationKit.value?.activeConversation.value;
      const itemMessages = active?.id === item.id ? active.engine.messages.value : [];
      return {
        id: item.id,
        name: item.title,
        schema: findLatestSchemaInConversation(itemMessages)?.schema ?? '',
      };
    }),
  );

  function getTemplateChatBaseConfig() {
    return { url: templateChatUrl, llmConfig: templateLlmConfig };
  }

  function changeLlmConfig(llmConfig: LLMConfig) {
    templateLlmConfig = llmConfig;
    templateProvider?.changeLlmConfig(llmConfig);
  }

  function createConversation() {
    return conversationKit.value?.createConversation({ title: t('template.defaultTitle') });
  }

  async function switchConversation(id: string) {
    const selected = await conversationKit.value?.switchConversation(id);
    normalizeMessages(selected?.engine.messages.value);
    return selected;
  }

  async function deleteConversation(id: string) {
    if (!conversationKit.value) return false;
    await conversationKit.value.deleteConversation(id);
    if (!conversationKit.value.conversations.value.length) {
      createConversation();
    }
    return conversationKit.value.conversations.value.length === 0;
  }

  function updateConversationTitle(id: string, title: string) {
    conversationKit.value?.updateConversationTitle(id, title);
  }

  function getMessageEngine() {
    return conversationKit.value?.activeConversation.value?.engine ?? null;
  }

  function getCurrentConversation() {
    return conversationKit.value?.activeConversation.value ?? null;
  }

  function setTemplateSchema(schema: unknown) {
    templateProvider?.setTemplateSchema(schema);
  }

  return {
    isTemplateInit,
    autoSaveMessages,
    conversationKit,
    templateProvider,
    messages,
    templateConversationState,
    currentConversationId,
    templateSchemaList,
    getTemplateChatBaseConfig,
    changeLlmConfig,
    createConversation,
    switchConversation,
    deleteConversation,
    updateConversationTitle,
    getMessageEngine,
    getCurrentConversation,
    setTemplateSchema,
  };
}
