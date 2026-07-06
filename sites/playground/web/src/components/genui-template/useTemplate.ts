import { ref, shallowRef, computed } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { LLMConfig, IMessageItem, IJsonPatchMessageItem, ISchemaCardMessageItem } from './chat.types';
import { t } from '../../i18n';
import {
  useTemplateConversation,
  type LegacyTemplateConversation,
} from '../genui-template-v2/useTemplateConversation';

const templateApi = shallowRef<ReturnType<typeof useTemplateConversation> | null>(null);
const legacyConversation = shallowRef<LegacyTemplateConversation | null>(null);
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
  legacyConversation.value = templateApi.value.legacyConversation;
  isTemplateInit.value = true;
}

export default function useTemplate(options?: UseTemplateOptions) {
  const templateEnabled = import.meta.env.VITE_ENABLE_TEMPLATE === 'true';

  if (options?.url && templateEnabled) {
    ensureTemplateConversation(options);
  }

  const conversation = legacyConversation.value;
  const messages = computed(() => conversation?.getCurrentConversation()?.messages ?? []);
  const templateConversationState = computed(() => conversation?.state);
  const currentConversationId = computed(() => conversation?.state.currentId ?? null);
  const messageManager = computed(() => conversation?.messageManager.value);

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
    if (!conversation) {
      return;
    }

    conversation.createConversation(t('template.defaultTitle'));
    void conversation.saveConversations();
    setCurrentSchema(null);
    setCurrentPreviewSchema(null);
    setCurrentCardId('');
  };

  const switchTemplate = (id: string) => {
    if (!conversation) {
      return;
    }

    conversation.switchConversation(id);
    const currentConv = conversation.getCurrentConversation();
    let latestSchema: string | null = null;

    if (!currentConv?.messages.length) {
      setCurrentSchema(null);
      setCurrentPreviewSchema(null);
      setCurrentCardId('');
      return;
    }

    const lastMessage = currentConv.messages[currentConv.messages.length - 1];

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
    if (!conversation) {
      return;
    }

    conversation.deleteConversation(id);
    void conversation.saveConversations();

    if (conversation.state.conversations.length === 0) {
      createTemplate();
    }
  };

  const updateTemplateTitle = (id: string, title: string) => {
    if (!conversation) {
      return;
    }

    conversation.updateTitle(id, title);
    void conversation.saveConversations();
  };

  const getMessageByCardId = (cardId: string) => {
    if (!conversation) {
      return;
    }

    let targetMessage = null;

    conversation.getCurrentConversation()?.messages.some((msg: ChatMessage) => {
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
    if (!conversation) {
      return [];
    }

    return conversation.state.conversations.map((item) => {
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
