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

  if (options?.url) {
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
    conversation.createConversation();
    resetEmptyTemplateSchema();
  };

  const switchTemplate = (id: string) => {
    conversation.switchConversation(id);
    const currentMessages = conversation.getCurrentConversation()?.messages;

    if (!currentMessages?.length) {
      resetEmptyTemplateSchema();
      return;
    }

    schema.applySchemaFromMessages(currentMessages);
  };

  const deleteTemplate = (id: string) => {
    const isEmpty = conversation.deleteConversation(id);
    if (isEmpty) {
      createTemplate();
    }
  };

  return {
    isTemplateInit: toRef(conversation, 'isTemplateInit'),
    conversationKit: toRef(conversation, 'conversationKit'),
    templateConversationState: toRef(conversation, 'templateConversationState'),
    templateSchemaList: toRef(conversation, 'templateSchemaList'),
    createTemplate,
    switchTemplate,
    deleteTemplate,
    changeLlmConfig: conversation.changeLlmConfig,
    updateTemplateTitle: conversation.updateConversationTitle,
  };
}
