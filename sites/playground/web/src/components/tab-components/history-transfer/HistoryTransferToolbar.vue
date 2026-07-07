<template>
  <div class="history-transfer-toolbar">
    <span class="history-transfer-toolbar__selection-toggle" :class="{ 'active': selectionActive }" @click="toggleSelectionMode">
      {{ selectionActive ? t('history.cancel') : t('history.selectMode') }}
    </span>
    <tiny-button
      round
      size="small"
      :disabled="!selectionActive || selectedIds.length === 0"
      @click="emit('batch-delete')"
    >
      {{ t('history.delete') }}
    </tiny-button>
    <tiny-button round size="small" @click="triggerImport">{{ t('history.import') }}</tiny-button>
    <tiny-dropdown
      border
      trigger="click"
      :title="t('history.export')"
      size="small"
      round
      :hide-on-click="true"
      :disabled="conversations.length === 0"
      @button-click="exportAll"
      @item-click="handleExportItemClick"
    >
      <template #dropdown>
        <tiny-dropdown-menu>
          <tiny-dropdown-item
            :label="t('history.exportAll')"
            :disabled="conversations.length === 0"
            :item-data="exportItemAll"
          />
          <tiny-dropdown-item
            :label="t('history.exportSelected')"
            :disabled="!selectionActive || selectedIds.length === 0"
            :item-data="exportItemSelected"
          />
        </tiny-dropdown-menu>
      </template>
    </tiny-dropdown>
    <input
      ref="fileInputRef"
      class="history-transfer-toolbar__file-input"
      type="file"
      accept="application/json,.json"
      @change="handleImportFile"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  TinyNotify,
  TinyButton,
  TinyDropdown,
  TinyDropdownMenu,
  TinyDropdownItem,
} from '@opentiny/vue';
import type { PersistedConversation } from '../../../types/conversation';
import { t } from '../../../i18n';
import { downloadConversations, parseConversationFile, reconcileImportedConversationIds } from './history-transfer';

const selectionActive = defineModel<boolean>('selectionActive', { default: false });

const props = withDefaults(
  defineProps<{
    conversations: PersistedConversation[];
    selectedIds?: string[];
    exportConversations?: (ids?: string[]) => Promise<PersistedConversation[] | undefined>;
  }>(),
  { selectedIds: () => [] },
);

const toggleSelectionMode = () => {
  selectionActive.value = !selectionActive.value;
};

const emit = defineEmits<{
  'import-conversations': [conversations: PersistedConversation[]];
  'batch-export': [];
  'batch-delete': [];
}>();

type ExportMenuAction = 'all' | 'selected';

const exportItemAll = { action: 'all' as ExportMenuAction };
const exportItemSelected = { action: 'selected' as ExportMenuAction };

const fileInputRef = ref<HTMLInputElement | null>(null);

const notify = (type: 'success' | 'warning' | 'error', message: string) => {
  TinyNotify({
    type,
    message,
    position: 'top-right',
  });
};

const triggerImport = () => {
  fileInputRef.value?.click();
};

const exportAll = async () => {
  if (props.conversations.length === 0) {
    notify('warning', t('history.noExportable'));
    return;
  }

  const items = props.exportConversations
    ? await props.exportConversations()
    : props.conversations;
  if (items?.length) {
    downloadConversations(items);
  }
};

const handleExportItemClick = (payload: { itemData?: { action: ExportMenuAction } }) => {
  const action = payload?.itemData?.action;
  if (action === 'all') {
    exportAll();
    return;
  }
  if (action === 'selected') {
    if (props.selectedIds.length === 0) {
      return;
    }
    emit('batch-export');
  }
};

const handleImportFile = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  try {
    const importedConversations = await parseConversationFile(file);
    if (importedConversations.length === 0) {
      notify('warning', t('history.noImportable'));
      return;
    }

    const reconciledImported = reconcileImportedConversationIds(props.conversations, importedConversations);
    emit('import-conversations', reconciledImported);
    notify('success', t('history.importSuccess', { count: reconciledImported.length }));
  } catch (error) {
    const message = error instanceof Error ? error.message : t('history.importFailed');
    notify('error', message);
  } finally {
    input.value = '';
  }
};
</script>

<style lang="less" scoped>
.history-transfer-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  .tiny-button {
    margin-left: 0;
  }
}

.history-transfer-toolbar__selection-toggle {
  margin-left: 12px;
  padding: 0;
  margin-right: 8px;
  font-size: 14px;
  line-height: 1;
  color: #191919;
  cursor: pointer;

  &.active {
    color: #1476FF;
  }
}

.history-transfer-toolbar__file-input {
  display: none;
}
</style>
