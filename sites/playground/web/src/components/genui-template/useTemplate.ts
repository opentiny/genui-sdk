import { toRef } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { LLMConfig } from './chat.types';
import { ensureTemplateContext } from './composables/use-template-context';
import { useTemplateConversation } from './composables/use-template-conversation';

export interface UseTemplateOptions {
  url: string;
  llmConfig?: LLMConfig;
  onLoaded?: (messages: ChatMessage[] | undefined) => void;
}

export default function useTemplate(options?: UseTemplateOptions) {
  const ctx = ensureTemplateContext();
  const templateEnabled = import.meta.env.VITE_ENABLE_TEMPLATE === 'true';

  if (options?.url && templateEnabled) {
    useTemplateConversation({
      url: options.url,
      llmConfig: options.llmConfig,
      onLoaded: (loadedMessages) => {
        if (options.onLoaded) {
          options.onLoaded(loadedMessages);
        } else {
          ctx.schema.applySchemaFromMessages(loadedMessages);
        }
      },
    });
  }

  const { conversation, schema } = ctx;

  const resetEmptyTemplateSchema = () => {
    schema.setCurrentSchema(null);
    schema.setCurrentPreviewSchema(null);
    schema.setCurrentCardId('');
  };

  const createTemplate = () => {
    const current = conversation.getCurrentConversation();
    if (current && (!current.messages || current.messages.length === 0)) {
      return;
    }
    conversation.createConversation();
    resetEmptyTemplateSchema();
  };

  const switchTemplate = async (id: string) => {
    await conversation.switchConversation(id);
    const currentMessages = conversation.getCurrentConversation()?.messages;

    if (!currentMessages?.length) {
      resetEmptyTemplateSchema();
      return;
    }

    schema.applySchemaFromMessages(currentMessages);
  };

  const deleteTemplate = async (id: string) => {
    const isEmpty = await conversation.deleteConversation(id);
    if (isEmpty) {
      conversation.createConversation();
      resetEmptyTemplateSchema();
      return;
    }
    const currentMessages = conversation.getCurrentConversation()?.messages;
    if (!currentMessages?.length) {
      resetEmptyTemplateSchema();
      return;
    }
    schema.applySchemaFromMessages(currentMessages);
  };

  return {
    isTemplateInit: toRef(conversation, 'isTemplateInit'),
    conversation: toRef(conversation, 'conversation'),
    conversationKit: toRef(conversation, 'conversationKit'),
    templateConversationState: toRef(conversation, 'templateConversationState'),
    templateSchemaList: toRef(conversation, 'templateSchemaList'),
    messageManager: toRef(conversation, 'messageManager'),
    createTemplate,
    switchTemplate,
    deleteTemplate,
    changeLlmConfig: conversation.changeLlmConfig,
    updateTemplateTitle: conversation.updateConversationTitle,
    importConversations: conversation.importConversations,
    exportConversations: conversation.exportConversations,
    updateConversationLastSchema: conversation.updateConversationLastSchema,
  };
}
