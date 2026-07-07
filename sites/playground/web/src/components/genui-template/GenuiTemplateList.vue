<script setup lang="ts">
// @ts-nocheck
import type { Conversation, ChatMessage } from '@opentiny/tiny-robot-kit';
import { TrHistory, useTouchDevice } from '@opentiny/tiny-robot';
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
import { t } from '../../i18n';

const TinyIconPlus = iconPlus();
const { isTouchDevice } = useTouchDevice();

const emit = defineEmits(['switch-template']);

const { templateConversationState, switchTemplate, deleteTemplate, updateTemplateTitle, createTemplate, conversation, importConversations } =
  useTemplate();

const selectedTemplateIds = ref<string[]>([]);
const selectionActive = ref(false);

const conversations = computed(() => templateConversationState.value?.conversations ?? []);

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

const handleImportConversations = async (imported: Conversation[]) => {
  const kit = conversation?.value;
  if (!kit || !importConversations) {
    return;
  }

  const reconciledImported = reconcileImportedConversationIds(kit.conversations.value, imported);
  await importConversations(
    reconciledImported.map((item) => ({
      id: item.id,
      title: item.title,
      messages: item.messages as ChatMessage[] | undefined,
      metadata: item.metadata as Record<string, unknown> | undefined,
    })),
  );
};

const handleItemClick = (item: Conversation) => {
  switchTemplate(item.id);

  emit('switch-template', item);
};

const handleItemAction = (action: { id: string }, item: Conversation) => {
  if (action.id === 'export') {
    downloadConversations([item], 'genui-template');
    return;
  }

  if (action.id === 'delete') {
    TinyModal.confirm(t('template.confirmDeleteOne'))
      .then((type: 'confirm' | 'cancel') => {
        if (type === 'cancel') {
          return;
        }
        deleteTemplate(item.id);
      });
  }
};

const handleItemTitleChange = (title: string, item: Conversation) => {
  updateTemplateTitle(item.id, title);
};

const handleAddItem = () => {
  createTemplate();
};

const handleBatchExport = () => {
  const idSet = new Set(selectedTemplateIds.value);
  const items = conversations.value.filter((c) => idSet.has(c.id));
  downloadConversations(items, 'genui-template');
};

const handleBatchDelete = () => {
  const ids = [...selectedTemplateIds.value];
  if (ids.length === 0) {
    return;
  }
  TinyModal.confirm(t('template.confirmBatchDelete', { count: ids.length }))
    .then((type: 'confirm' | 'cancel') => {
      if (type === 'cancel') {
        return;
      }
      for (const id of ids) {
        deleteTemplate(id);
      }
      selectedTemplateIds.value = [];
    });
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
      :conversations="conversations"
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
