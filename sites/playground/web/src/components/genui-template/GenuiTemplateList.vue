<script setup lang="ts">
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import { TrHistory, useTouchDevice, type HistoryItem, type HistoryMenuItem } from '@opentiny/tiny-robot';
import { computed, ref, watch } from 'vue';
import { TinyModal, TinyCheckboxGroup, TinyCheckbox } from '@opentiny/vue';
import { iconPlus } from '@opentiny/vue-icon';
import useTemplate from './useTemplate';
import {
  HistoryTransferToolbar,
  downloadConversations,
  getHistoryMenuItems,
  reconcileImportedConversationIds,
} from '../tab-components/history-transfer';
import type { PersistedConversation } from '../../types/conversation';
import { t } from '../../i18n';

const TinyIconPlus = iconPlus();
const { isTouchDevice } = useTouchDevice();

const emit = defineEmits(['switch-template']);

const {
  conversation,
  templateConversationState,
  updateTemplateTitle,
  switchTemplate,
  deleteTemplate,
  createTemplate,
  importConversations,
  exportConversations,
} = useTemplate();

const selectedTemplateIds = ref<string[]>([]);
const selectionActive = ref(false);

const conversations = computed((): HistoryItem[] =>
  (templateConversationState.value?.conversations ?? []).map((item) => ({
    ...item,
    title: item.title || t('template.defaultTitle'),
  })),
);

const historyMenuItems = getHistoryMenuItems();

watch(selectionActive, (active) => {
  if (!active) {
    selectedTemplateIds.value = [];
  }
});

watch(
  () => conversations.value.map((c) => c.id),
  (newVal) => {
    const idSet = new Set(newVal);
    selectedTemplateIds.value = selectedTemplateIds.value.filter((id) => idSet.has(id));
  },
);

const handleImportConversations = async (imported: PersistedConversation[]) => {
  const kit = conversation.value;
  if (!kit || !importConversations) {
    return;
  }

  const reconciledImported = reconcileImportedConversationIds(
    kit.conversations.value as PersistedConversation[],
    imported,
  );
  await importConversations(
    reconciledImported.map((item) => ({
      id: item.id,
      title: item.title,
      messages: item.messages as ChatMessage[] | undefined,
      metadata: item.metadata as Record<string, unknown> | undefined,
    })),
  );
};

const handleItemClick = (item: HistoryItem) => {
  if (!item.id) {
    return;
  }
  switchTemplate(item.id);
  emit('switch-template', item);
};

const handleItemAction = async (action: HistoryMenuItem, item: HistoryItem) => {
  if (!item.id) {
    return;
  }
  if (action.id === 'export') {
    const items = await exportConversations?.([item.id]);
    if (items?.length) {
      downloadConversations(items, 'genui-template');
    }
    return;
  }

  if (action.id === 'delete') {
    TinyModal.confirm(t('template.confirmDeleteOne')).then(async (type: 'confirm' | 'cancel') => {
      if (type === 'cancel') {
        return;
      }
      await deleteTemplate(item.id!);
    });
  }
};

const handleItemTitleChange = (title: string, item: HistoryItem) => {
  if (!item.id) {
    return;
  }
  updateTemplateTitle(item.id, title);
};

const handleAddItem = () => {
  createTemplate();
};

const handleBatchExport = async () => {
  const idSet = new Set(selectedTemplateIds.value);
  const items = await exportConversations?.([...idSet]);
  if (items?.length) {
    downloadConversations(items, 'genui-template');
  }
};

const handleBatchDelete = () => {
  const ids = [...selectedTemplateIds.value];
  if (ids.length === 0) {
    return;
  }
  TinyModal.confirm(t('template.confirmBatchDelete', { count: ids.length })).then(
    async (type: 'confirm' | 'cancel') => {
      if (type === 'cancel') {
        return;
      }
      for (const id of ids) {
        await deleteTemplate(id);
      }
      selectedTemplateIds.value = [];
    },
  );
};
</script>

<template>
  <div class="genui-template-list">
    <button class="new-template-btn" type="button" @click="handleAddItem">
      <TinyIconPlus :size="16" />
      <span class="new-template-btn__text">{{ t('template.new') }}</span>
    </button>
    <history-transfer-toolbar
      v-model:selection-active="selectionActive"
      :conversations="(conversations as PersistedConversation[])"
      :selected-ids="selectedTemplateIds"
      @import-conversations="handleImportConversations"
      @batch-export="handleBatchExport"
      @batch-delete="handleBatchDelete"
    />
    <tiny-checkbox-group v-model="selectedTemplateIds">
      <tr-history
        class="tr-history-container"
        :data="conversations"
        :selected="templateConversationState?.currentId || undefined"
        :show-rename-controls="isTouchDevice"
        :menu-items="historyMenuItems"
        :menu-list-gap="12"
        @item-action="handleItemAction"
        @item-title-change="handleItemTitleChange"
        @item-click="handleItemClick"
      >
        <template #item-prefix="{ item }">
          <tiny-checkbox
            v-if="selectionActive"
            :label="item.id"
            :value="item.id"
            text=""
            @click.stop
          />
        </template>
      </tr-history>
    </tiny-checkbox-group>
  </div>
</template>

<style scoped lang="less">
.genui-template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.new-template-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  height: 36px;
  border: 1px solid #c2c2c2;
  border-radius: 10px;
  cursor: pointer;
  white-space: nowrap;
  background: transparent;
  appearance: none;
  font: inherit;

  &:focus-visible {
    outline: 2px solid #1677ff;
    outline-offset: 2px;
  }

  &__text {
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
  }

  &:hover {
    background: #0000000a;
  }
}

.tr-history-container {
  --tr-history-empty-padding: calc((100vh - 380px) / 2) 0;
  --tr-history-empty-padding: calc((100dvh - 380px) / 2) 0;
  width: 100%;

  :deep(.tr-history__item.selected) {
    background-color: #f2f0f0;
  }
}

:deep(.history-transfer-toolbar__selection-toggle) {
  margin-left: 0;
}
</style>
