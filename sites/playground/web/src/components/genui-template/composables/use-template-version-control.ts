import { computed, ref } from 'vue';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { ISchemaManualMessageItem, ISchemaManualEditRecord } from '../chat.types';
import { formatDate, generateId } from '../../../utils';
import {
  isRenderableSchema,
  findLatestSchemaCardInConversation,
  collectSchemaVersionHistory,
  groupSchemaVersionHistory,
  filterSchemaVersionHistoryForCard,
  resolveSchemaCardScopeId,
  findSchemaCardByCardId,
  findManualCardInMessages,
  getMergeableManualSaveMessage,
  getManualEdits,
  syncManualCardLatestFields,
  manualEditToCardSnapshot,
  resolveSchemaVersionDiffOriginal,
  resolveSchemaVersionDiffModified,
  hasUnifiedDiffChanges,
} from '../template-chat-utils';
import { useTemplateSchema } from './use-template-schema';
import { useTemplateConversation } from './use-template-conversation';

const historyDiffFromPanel = ref(false);

function isSameSchema(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function useTemplateVersionControl() {
  const {
    currentCardId,
    currentSchema,
    currentPreviewSchema,
    setCurrentSchema,
    setCurrentPreviewSchema,
    setCurrentCardId,
    applySchemaFromMessages,
  } = useTemplateSchema();
  const {
    templateConversationState,
    messages,
    getMessageManager,
    getCurrentConversation,
    saveConversations,
  } = useTemplateConversation();

  const latestSchemaCardId = computed(() => findLatestSchemaCardInConversation(messages.value)?.cardId ?? '');

  const allSchemaVersionHistoryEntries = computed(() =>
    collectSchemaVersionHistory(messages.value, {
      currentCardId: currentCardId.value,
      latestCardId: latestSchemaCardId.value,
    }),
  );

  const currentHistoryScopeCardId = computed(() =>
    currentCardId.value ? resolveSchemaCardScopeId(messages.value, currentCardId.value) : '',
  );

  const schemaVersionHistoryGroups = computed(() => {
    const scopedEntries = filterSchemaVersionHistoryForCard(
      allSchemaVersionHistoryEntries.value,
      messages.value,
      currentHistoryScopeCardId.value,
      currentCardId.value,
    );
    return groupSchemaVersionHistory(scopedEntries);
  });

  function isLatestSchemaVersionCard(cardId: string) {
    if (!cardId || !latestSchemaCardId.value) {
      return false;
    }
    if (cardId === latestSchemaCardId.value) {
      return true;
    }
    return allSchemaVersionHistoryEntries.value.some((entry) => entry.isLatest && entry.cardId === cardId);
  }

  const flatSchemaVersionHistoryEntries = computed(() =>
    schemaVersionHistoryGroups.value.flatMap((group) => group.items),
  );

  const currentHistoryEntry = computed(
    () => flatSchemaVersionHistoryEntries.value.find((entry) => entry.cardId === currentCardId.value) ?? null,
  );

  const showReturnLatestButton = computed(() => {
    const cardId = currentCardId.value;
    if (!cardId || isLatestSchemaVersionCard(cardId)) {
      return false;
    }
    const preview = currentPreviewSchema.value;
    const committed = currentSchema.value;
    if (preview == null || committed == null) {
      return true;
    }
    return !isSameSchema(preview, committed);
  });

  const schemaEditorDiffOriginal = computed(() => {
    const entry = currentHistoryEntry.value;
    if (!entry) {
      return '{}';
    }
    return resolveSchemaVersionDiffOriginal(entry, flatSchemaVersionHistoryEntries.value);
  });

  const schemaEditorDiffModified = computed(() => {
    const entry = currentHistoryEntry.value;
    if (!entry) {
      return '{}';
    }
    return resolveSchemaVersionDiffModified(entry);
  });

  const schemaEditorShowDiffView = computed(() => {
    if (!historyDiffFromPanel.value || !currentHistoryEntry.value) {
      return false;
    }
    return hasUnifiedDiffChanges(schemaEditorDiffOriginal.value, schemaEditorDiffModified.value);
  });

  const isEditorReadOnly = computed(() => showReturnLatestButton.value);

  function getMessageByCardId(cardId: string) {
    if (!cardId) {
      return;
    }

    const msgs = getCurrentConversation()?.messages;
    const aiCard = findSchemaCardByCardId(msgs, cardId);
    if (aiCard) {
      return aiCard;
    }

    const manualCard = findManualCardInMessages(msgs, cardId);
    if (!manualCard) {
      return;
    }

    const matchedEdit = getManualEdits(manualCard).find((edit) => edit.editId === cardId);
    return matchedEdit ? manualEditToCardSnapshot(manualCard, matchedEdit) : manualCard;
  }

  function writeNewVersion(
    schemaPayload: Record<string, unknown>,
    options: {
      prevSchema?: Record<string, unknown>;
      input?: string;
      sourceCardId?: string;
      sourceCardGeneratedTime?: string;
      sourceCardInput?: string;
    } = {},
  ) {
    const messageMgr = getMessageManager();
    const currentConversation = getCurrentConversation();
    if (!messageMgr || !currentConversation) {
      return null;
    }

    const prevSchema = options.prevSchema ?? currentSchema.value ?? {};
    const prevSchemaStr = JSON.stringify(prevSchema);
    const schemaStr = JSON.stringify(schemaPayload);
    const generatedTime = formatDate(new Date());
    const userInput = options.input?.trim();
    const editRecord: ISchemaManualEditRecord = {
      editId: generateId(),
      schema: schemaStr,
      prevSchema: prevSchemaStr,
      generatedTime,
      input: userInput ?? '',
      inputType: userInput ? 'user' : 'manual_edit_save',
    };

    function attachSourceMetadata(sourceCardId: string) {
      editRecord.sourceCardId = sourceCardId;
      if (options.sourceCardInput?.trim()) {
        editRecord.sourceCardInput = options.sourceCardInput.trim();
      }
      if (options.sourceCardGeneratedTime?.trim()) {
        editRecord.sourceCardGeneratedTime = options.sourceCardGeneratedTime.trim();
      }
      const sourceCard = getMessageByCardId(sourceCardId);
      if (!editRecord.sourceCardInput?.trim() && sourceCard?.input?.trim()) {
        editRecord.sourceCardInput = sourceCard.input.trim();
      }
      if (!editRecord.sourceCardGeneratedTime?.trim() && sourceCard?.generatedTime?.trim()) {
        editRecord.sourceCardGeneratedTime = sourceCard.generatedTime;
      }
    }

    if (options.sourceCardId) {
      attachSourceMetadata(options.sourceCardId);
    }

    const msgs = messageMgr.messages.value as ChatMessage[];
    const mergeTarget = getMergeableManualSaveMessage(msgs);

    let cardId: string;

    if (mergeTarget) {
      const { message: lastMessage, card } = mergeTarget;
      card.edits = [...getManualEdits(card), editRecord];
      syncManualCardLatestFields(card);
      cardId = card.cardId;
      lastMessage.messageId = cardId;
    } else {
      cardId = generateId();
      const cardMessage: ISchemaManualMessageItem = {
        type: 'schema-manual',
        content: schemaStr,
        input: editRecord.input,
        inputType: editRecord.inputType,
        cardId,
        generatedTime,
        schema: schemaStr,
        prevSchema: prevSchemaStr,
        edits: [editRecord],
      };

      const manualSaveMessage = {
        role: 'assistant',
        content: '',
        messageId: cardId,
        messages: [cardMessage],
      } as ChatMessage;

      msgs.push(manualSaveMessage);
    }

    messageMgr.messages.value = [...msgs];

    setCurrentSchema(schemaPayload);
    setCurrentPreviewSchema(schemaPayload);
    setCurrentCardId(cardId);
    saveConversations();

    return cardId;
  }

  function resetVersionPreviewMode() {
    historyDiffFromPanel.value = false;
  }

  function previewVersion(
    schema: Record<string, unknown>,
    cardId: string,
    previewOptions: { diffFromHistory?: boolean } = {},
  ) {
    currentCardId.value = cardId;
    historyDiffFromPanel.value = !!previewOptions.diffFromHistory;
    setCurrentPreviewSchema(schema);
    if (isLatestSchemaVersionCard(cardId)) {
      setCurrentSchema(schema);
    }
  }

  function selectVersionCard(cardId: string) {
    if (!cardId) {
      return;
    }
    currentCardId.value = cardId;
    resetVersionPreviewMode();
  }

  function resolvePrevSchema() {
    const effectiveSchema = currentSchema.value;
    if (
      effectiveSchema
      && typeof effectiveSchema === 'object'
      && !Array.isArray(effectiveSchema)
      && isRenderableSchema(effectiveSchema)
    ) {
      return effectiveSchema as Record<string, unknown>;
    }
    return undefined;
  }

  function resolveSourceMetadata() {
    const cardId = currentCardId.value;
    const fallbackEntry = allSchemaVersionHistoryEntries.value.find((entry) => entry.cardId === cardId);
    return {
      sourceCardGeneratedTime: currentHistoryEntry.value?.generatedTime ?? fallbackEntry?.generatedTime,
      sourceCardInput: currentHistoryEntry.value?.input ?? fallbackEntry?.input,
    };
  }

  function applyCurrentVersion() {
    if (!showReturnLatestButton.value) {
      return false;
    }

    const schema = currentPreviewSchema.value;
    if (!schema || !isRenderableSchema(schema)) {
      return false;
    }

    const saved = writeNewVersion(schema as Record<string, unknown>, {
      prevSchema: resolvePrevSchema(),
      sourceCardId: currentCardId.value,
      ...resolveSourceMetadata(),
    });
    if (!saved) {
      return false;
    }

    resetVersionPreviewMode();
    return true;
  }

  function resetToLatestVersion() {
    const conversationState = templateConversationState.value;
    if (!conversationState) {
      return;
    }
    applySchemaFromMessages(messages.value, {
      clearIfMissing: !conversationState.loading,
    });
    resetVersionPreviewMode();
  }

  function onSchemaRefresh() {
    resetVersionPreviewMode();
  }

  return {
    showReturnLatestButton,
    isEditorReadOnly,
    schemaEditorDiffOriginal,
    schemaEditorDiffModified,
    schemaEditorShowDiffView,
    schemaVersionHistoryGroups,
    flatSchemaVersionHistoryEntries,
    currentHistoryEntry,
    getMessageByCardId,
    writeNewVersion,
    previewVersion,
    selectVersionCard,
    applyCurrentVersion,
    resetToLatestVersion,
    onSchemaRefresh,
    resetVersionPreviewMode,
  };
}
