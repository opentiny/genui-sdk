import { computed, unref, type UnwrapNestedRefs } from 'vue';
import { TinyModal } from '@opentiny/vue';
import { useIsMobile } from '../../../use-mobile';
import { t } from '../../../i18n';
import { isRenderableSchema, rebuildSchemaFromCard } from '../template-chat-utils';
import type { ISchemaVersionHistoryEntry } from '../template-chat-utils/schema-version-history';
import { useTemplateVersionControl } from './use-template-version-control';
import { useSchemaEditor } from './use-schema-editor';
import { useTemplateUi } from './use-template-ui';

export interface TemplateActionsDeps {
  versionControl: UnwrapNestedRefs<ReturnType<typeof useTemplateVersionControl>>;
  editor: ReturnType<typeof useSchemaEditor>;
  ui: UnwrapNestedRefs<ReturnType<typeof useTemplateUi>>;
}

export function useTemplateActions(deps?: TemplateActionsDeps) {
  const { isMobile } = useIsMobile();
  const versionControl = deps?.versionControl ?? useTemplateVersionControl();
  const editor = deps?.editor ?? useSchemaEditor();
  const ui = deps?.ui ?? useTemplateUi();

  const isJsonEditorActive = computed(() => unref(ui.isJsonEditorActive));

  const schemaEditorDirty = computed(
    () => isJsonEditorActive.value && editor.hasUnsavedChanges(),
  );

  function closeSchemaEditorView() {
    editor.revertUnsavedChanges();
    ui.setJsonEditorOpen(false);
    if (isMobile.value) {
      ui.setRendererPanelVisible(false);
    }
    versionControl.resetVersionPreviewMode();
  }

  function closeRendererPanel() {
    ui.setRendererPanelVisible(false);
    closeSchemaEditorView();
  }

  function setJsonEditorOpen(open: boolean) {
    if (open === isJsonEditorActive.value) {
      return;
    }
    open ? editor.syncBaseline() : editor.revertUnsavedChanges();
    ui.setJsonEditorOpen(open);
  }

  function toggleSchemaEditor() {
    setJsonEditorOpen(!isJsonEditorActive.value);
  }

  function handleMobileJsonEditorOpen(open: boolean) {
    setJsonEditorOpen(open);
  }

  function applySchemaVersionPreview(
    schema: Record<string, unknown>,
    cardId: string,
    options: { diffFromHistory?: boolean } = {},
  ) {
    versionControl.previewVersion(schema, cardId, options);
    ui.setRendererPanelVisible(true);
    if (isMobile.value || unref(ui.schemaEditorVisible)) {
      editor.syncBaseline();
    }
  }

  async function toggleSchemaVersion(
    schema: Record<string, unknown>,
    cardId: string,
    options: { diffFromHistory?: boolean } = {},
  ) {
    if (editor.hasUnsavedChanges()) {
      const type = await TinyModal.confirm(t('templateEditor.confirmDiscardUnsaved'));
      if (type === 'cancel') {
        return false;
      }
      editor.revertUnsavedChanges();
    }
    applySchemaVersionPreview(schema, cardId, options);
    return true;
  }

  async function handleSchemaVersionToggle(
    schema: Record<string, unknown> | null,
    cardId: string,
  ) {
    if (schema) {
      await toggleSchemaVersion(schema, cardId);
      return;
    }
    versionControl.selectVersionCard(cardId);
  }

  async function handleHistoryEntrySelect(entry: ISchemaVersionHistoryEntry) {
    if (entry.isPending) {
      return;
    }

    const schema = rebuildSchemaFromCard(entry.cardMessage);
    if (!schema) {
      return;
    }

    const switched = await toggleSchemaVersion(schema, entry.cardId, { diffFromHistory: true });
    if (!switched) {
      return;
    }
    ui.closeHistoryPanel();
    setJsonEditorOpen(true);
  }

  function applyCurrentVersion() {
    if (!versionControl.applyCurrentVersion()) {
      return;
    }
    editor.syncBaseline();
  }

  async function handleSaveSchemaEditor() {
    if (!schemaEditorDirty.value || editor.schemaEditorSaveLoading.value) {
      return;
    }

    const schema = editor.parseEditorSchema();
    if (!schema || !isRenderableSchema(schema)) {
      return;
    }

    editor.schemaEditorSaveLoading.value = true;
    try {
      const saved = versionControl.writeNewVersion(schema, { prevSchema: editor.parseBaselineSchema() });
      if (saved) {
        editor.syncBaseline();
        closeSchemaEditorView();
      }
    } finally {
      editor.schemaEditorSaveLoading.value = false;
    }
  }

  function resetToLatestVersion() {
    versionControl.resetToLatestVersion();
    editor.syncBaseline();
    if (isJsonEditorActive.value) {
      setJsonEditorOpen(false);
    }
  }

  function resetAll() {
    ui.resetUi();
    resetToLatestVersion();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') {
      return;
    }
    if (isJsonEditorActive.value) {
      setJsonEditorOpen(false);
      return;
    }
    if (isMobile.value && unref(ui.rendererPanelVisible)) {
      closeSchemaEditorView();
      return;
    }
    if (unref(ui.schemaEditorVisible)) {
      closeSchemaEditorView();
    }
  }

  function shouldSyncEditorBaseline() {
    if (unref(versionControl.schemaEditorShowDiffView) || editor.hasUnsavedChanges()) {
      return false;
    }
    return isJsonEditorActive.value;
  }

  return {
    toggleSchemaEditor,
    closeSchemaEditorView,
    closeRendererPanel,
    handleMobileJsonEditorOpen,
    handleHistoryEntrySelect,
    handleSchemaVersionToggle,
    toggleSchemaVersion,
    applyCurrentVersion,
    handleSaveSchemaEditor,
    resetToLatestVersion,
    resetAll,
    handleKeydown,
    shouldSyncEditorBaseline,
    syncBaseline: editor.syncBaseline,
    schemaEditorDirty,
  };
}
