import { ref, shallowRef, computed } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { ImportConversationItem } from '@opentiny/genui-sdk-vue';
import type { LLMConfig, IMessageItem, IJsonPatchMessageItem, ISchemaCardMessageItem } from './chat.types';
import { t } from '../../i18n';
import { useTemplateConversation } from './useTemplateConversation';

const templateApi = shallowRef<ReturnType<typeof useTemplateConversation> | null>(null);
const llmConfigRef = shallowRef<LLMConfig>({ model: '', temperature: 0.5 });

const isTemplateInit = ref(false);
const currentSchema = shallowRef<any>(null);
const currentPreviewSchema = shallowRef<any>(null);
const currentPreviewSchemaComplete = ref(true);
const currentCardId = ref<string>('');

export interface UseTemplateOptions {
  url: string;
  llmConfig?: LLMConfig;
}

function ensureTemplateConversation(options: UseTemplateOptions) {
  if (templateApi.value) {
    if (options.llmConfig) {
      llmConfigRef.value = options.llmConfig;
    }
    return;
  }

  if (options.llmConfig) {
    llmConfigRef.value = options.llmConfig;
  }

  templateApi.value = useTemplateConversation({
    getUrl: () => options.url,
    getLlmConfig: () => llmConfigRef.value,
    getTemplateSchema: () => currentSchema.value,
  });
  isTemplateInit.value = true;
}

export default function useTemplate(options?: UseTemplateOptions) {
  const templateEnabled = import.meta.env.VITE_ENABLE_TEMPLATE === 'true';

  if (options?.url && templateEnabled) {
    ensureTemplateConversation(options);
  }

  const conversation = computed(() => templateApi.value?.conversation);
  const loading = computed(() => templateApi.value?.loading.value ?? true);
  const messageManager = computed(() => templateApi.value?.messageManager.value);

  const templateConversationState = computed(() => ({
    conversations: conversation.value?.conversations.value ?? [],
    currentId: conversation.value?.activeConversationId.value ?? null,
    loading: loading.value,
  }));

  const currentConversationId = computed(() => conversation.value?.activeConversationId.value ?? null);

  const messages = computed(
    () => conversation.value?.activeConversation.value?.engine.messages.value ?? [],
  );

  const importConversations = (items: ImportConversationItem[]) =>
    templateApi.value?.importConversations(items);

  const exportConversations = (ids?: string[]) => templateApi.value?.exportConversations(ids);

  const setCurrentPreviewSchema = (schema: any, isComplete: boolean = true) => {
    currentPreviewSchema.value = schema;
    if (isComplete !== currentPreviewSchemaComplete.value) {
      currentPreviewSchemaComplete.value = isComplete;
    }
  };

  const setCurrentSchema = (schema: any) => {
    currentSchema.value = schema;
  };

  const createTemplate = () => {
    templateApi.value?.createConversation(t('template.defaultTitle'));
    setCurrentSchema(null);
    setCurrentPreviewSchema(null);
    setCurrentCardId('');
  };

  const switchTemplate = (id: string) => {
    const kit = conversation.value;
    if (!kit) {
      return;
    }

    void kit.switchConversation(id);
    const currentMessages = kit.activeConversation.value?.engine.messages.value ?? [];
    let latestSchema: string | null = null;

    if (!currentMessages.length) {
      setCurrentSchema(null);
      setCurrentPreviewSchema(null);
      setCurrentCardId('');
      return;
    }

    const lastMessage = currentMessages[currentMessages.length - 1];

    (lastMessage?.messages as IMessageItem[] | undefined)?.some((message: IMessageItem) => {
      if (message.type === 'schema-card' || message.type === 'json-patch') {
        latestSchema = message.schema;
        setCurrentCardId(message.cardId ?? '');
        return true;
      }
      return false;
    });

    if (latestSchema) {
      setCurrentSchema(JSON.parse(latestSchema));
      setCurrentPreviewSchema(JSON.parse(latestSchema));
      return;
    }

    setCurrentSchema(null);
    setCurrentPreviewSchema(null);
    setCurrentCardId('');
  };

  const deleteTemplate = (id: string) => {
    const kit = conversation.value;
    if (!kit) {
      return;
    }

    void kit.deleteConversation(id);

    if (kit.conversations.value.length === 0) {
      createTemplate();
    }
  };

  const updateTemplateTitle = (id: string, title: string) => {
    conversation.value?.updateConversationTitle(id, title);
  };

  const getMessageByCardId = (cardId: string) => {
    const kit = conversation.value;
    if (!kit) {
      return;
    }

    let targetMessage = null;

    kit.activeConversation.value?.engine.messages.value.some((msg: ChatMessage) => {
      const messageItems = msg.messages as IMessageItem[] | undefined;

      if (!messageItems || !Array.isArray(messageItems)) {
        return false;
      }

      const card = messageItems.find(
        (message): message is IJsonPatchMessageItem | ISchemaCardMessageItem =>
          (message.type === 'schema-card' || message.type === 'json-patch') && message.cardId === cardId,
      );

      if (card) {
        targetMessage = card;
        return true;
      }

      return false;
    });

    return targetMessage ?? undefined;
  };

  const setCurrentCardId = (cardId: string) => {
    currentCardId.value = cardId;
  };

  const getCurrentCardId = () => currentCardId.value;

  const updateConversationLastSchema = (schema: unknown) => {
    templateApi.value?.updateConversationLastSchema(schema);
  };

  const templateSchemaList = computed(() => {
    const kit = conversation.value;
    if (!kit) {
      return [];
    }

    return kit.conversations.value.map((item) => {
      const metadataSchema = item.metadata?.lastSchema;
      if (typeof metadataSchema === 'string' && metadataSchema) {
        return {
          id: item.id,
          name: item.title,
          schema: metadataSchema,
        };
      }

      return {
        id: item.id,
        name: item.title,
        schema: '',
      };
    });
  });

  return {
    isTemplateInit,
    templateConversationState,
    conversation,
    messageManager,
    currentSchema,
    currentPreviewSchema,
    currentPreviewSchemaComplete,
    currentCardId,
    currentConversationId,
    messages,
    templateSchemaList,
    createTemplate,
    importConversations,
    exportConversations,
    setCurrentPreviewSchema,
    setCurrentSchema,
    setCurrentCardId,
    getCurrentCardId,
    switchTemplate,
    deleteTemplate,
    updateTemplateTitle,
    getMessageByCardId,
    updateConversationLastSchema,
  };
}
