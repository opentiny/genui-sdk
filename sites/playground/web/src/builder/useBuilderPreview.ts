import { ref, computed, provide, inject, onUnmounted, type InjectionKey } from 'vue';
import {
  extractTitleFromSchema,
  formatCardSchemaText,
  type IBuilderCardMessageItem,
} from './builder-schema-utils';
import { getLatestBuilderCard, findLatestBuilderCardRef, findBuilderCardById } from './builder-history-utils';
import { getBuilderConversationMessages } from './builder-conversation-bridge';
import {
  registerBuilderPreviewBridge,
  unregisterBuilderPreviewBridge,
} from './builder-preview-bridge';

const builderPreviewKey: InjectionKey<ReturnType<typeof createBuilderPreview>> = Symbol('builderPreview');

function createBuilderPreview() {
  const activeCardId = ref('');
  const activeCardSchemaRaw = ref('');
  const previewPanelVisible = ref(false);
  const schemaEditorVisible = ref(false);
  const historyPanelVisible = ref(false);
  const schemaEditorText = ref('{}');

  const syncEditorFromPreview = () => {
    schemaEditorText.value = formatCardSchemaText(activeCardSchemaRaw.value);
  };

  const openCard = (card: IBuilderCardMessageItem) => {
    const getMessages = getBuilderConversationMessages();
    const liveCard = getMessages ? findBuilderCardById(getMessages(), card.id) : null;
    const source = liveCard ?? card;

    if (!source.createdTime) {
      return;
    }

    const schemaText = source.schema ?? '';
    activeCardId.value = source.id;
    activeCardSchemaRaw.value = schemaText;
    syncEditorFromPreview();
    previewPanelVisible.value = true;
  };

  const closePreview = () => {
    previewPanelVisible.value = false;
    schemaEditorVisible.value = false;
    historyPanelVisible.value = false;
    activeCardId.value = '';
    activeCardSchemaRaw.value = '';
  };

  const toggleHistoryPanel = () => {
    historyPanelVisible.value = !historyPanelVisible.value;
    if (historyPanelVisible.value) {
      schemaEditorVisible.value = false;
    }
  };

  const closeHistoryPanel = () => {
    historyPanelVisible.value = false;
  };

  const toggleSchemaEditor = () => {
    schemaEditorVisible.value = !schemaEditorVisible.value;
    if (schemaEditorVisible.value) {
      historyPanelVisible.value = false;
      syncEditorFromPreview();
    }
  };

  const closeSchemaEditor = () => {
    schemaEditorVisible.value = false;
  };

  const syncSchemaFromEditor = (text: string) => {
    schemaEditorText.value = text;
    activeCardSchemaRaw.value = text;
  };

  const resetToLatestVersion = () => {
    const getMessages = getBuilderConversationMessages();
    if (!getMessages) {
      return;
    }

    const latestCard = getLatestBuilderCard(getMessages());
    if (!latestCard) {
      return;
    }

    openCard(latestCard);
  };

  const applyCurrentVersion = () => {
    const schemaText = activeCardSchemaRaw.value?.trim();
    if (!schemaText) {
      return;
    }

    const getMessages = getBuilderConversationMessages();
    if (!getMessages) {
      return;
    }

    const latestCard = findLatestBuilderCardRef(getMessages());
    if (!latestCard) {
      return;
    }

    latestCard.schema = schemaText;
    latestCard.title = extractTitleFromSchema(schemaText, latestCard.input || '');

    openCard(latestCard);
  };

  const latestCardId = computed(() => {
    const getMessages = getBuilderConversationMessages();
    if (!getMessages) {
      return '';
    }

    return getLatestBuilderCard(getMessages())?.id ?? '';
  });

  const showVersionActionButtons = computed(() =>
    Boolean(
      activeCardId.value &&
      latestCardId.value &&
      activeCardId.value !== latestCardId.value,
    ),
  );

  return {
    activeCardId,
    activeCardSchemaRaw,
    previewPanelVisible,
    schemaEditorVisible,
    historyPanelVisible,
    schemaEditorText,
    hasPreviewSchema: computed(() => Boolean(activeCardSchemaRaw.value?.trim())),
    openCard,
    closePreview,
    toggleHistoryPanel,
    closeHistoryPanel,
    toggleSchemaEditor,
    closeSchemaEditor,
    syncSchemaFromEditor,
    resetToLatestVersion,
    applyCurrentVersion,
    latestCardId,
    showVersionActionButtons,
  };
}

export function provideBuilderPreview() {
  const preview = createBuilderPreview();
  provide(builderPreviewKey, preview);
  registerBuilderPreviewBridge({ openCard: preview.openCard });
  onUnmounted(unregisterBuilderPreviewBridge);
  return preview;
}

export function useBuilderPreview() {
  const preview = inject(builderPreviewKey, null);
  if (!preview) {
    throw new Error('useBuilderPreview must be used within BuilderWorkspace');
  }
  return preview;
}
