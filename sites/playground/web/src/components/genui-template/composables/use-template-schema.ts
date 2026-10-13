import { ref, shallowRef } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { useTemplateConversation } from './use-template-conversation';
import {
  findLatestSchemaInConversation,
  resolveRenderableSchemaFromMessages,
  backfillJsonPatchApplyFailedFlags,
} from '../template-chat-utils';

const currentSchema = shallowRef<any>(null);
const currentPreviewSchema = shallowRef<any>(null);
const currentPreviewSchemaComplete = ref(true);
const currentCardId = ref<string>('');

export function useTemplateSchema() {
  const { setTemplateSchema, saveConversations } = useTemplateConversation();

  function setCurrentPreviewSchema(schema: any, isComplete: boolean = true) {
    currentPreviewSchema.value = schema;
    if (isComplete !== currentPreviewSchemaComplete.value) {
      currentPreviewSchemaComplete.value = isComplete;
    }
  }

  function setCurrentSchema(schema: any) {
    currentSchema.value = schema;
    setTemplateSchema(schema);
  }

  function setCurrentCardId(cardId: string) {
    currentCardId.value = cardId;
  }

  function getCurrentCardId() {
    return currentCardId.value;
  }

  function applySchemaFromMessages(
    messages: ChatMessage[] | undefined,
    options: { clearIfMissing?: boolean } = {},
  ) {
    const { clearIfMissing = true } = options;
    if (backfillJsonPatchApplyFailedFlags(messages)) {
      saveConversations();
    }
    const latestSchemaInfo = findLatestSchemaInConversation(messages);

    if (latestSchemaInfo) {
      const resolved = resolveRenderableSchemaFromMessages(messages);
      if (resolved) {
        currentSchema.value = resolved.schema;
        currentPreviewSchema.value = resolved.schema;
        currentPreviewSchemaComplete.value = true;
        setTemplateSchema(resolved.schema);
        currentCardId.value = resolved.cardId;
        return true;
      }
    }

    if (clearIfMissing) {
      currentSchema.value = null;
      currentPreviewSchema.value = null;
      currentCardId.value = '';
    }

    return false;
  }

  return {
    currentSchema,
    currentPreviewSchema,
    currentPreviewSchemaComplete,
    currentCardId,
    setCurrentPreviewSchema,
    setCurrentSchema,
    setCurrentCardId,
    getCurrentCardId,
    applySchemaFromMessages,
  };
}
