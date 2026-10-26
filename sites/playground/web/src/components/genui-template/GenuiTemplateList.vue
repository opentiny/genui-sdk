<script setup lang="ts">
import { TrHistory, useTouchDevice, type HistoryItem, type HistoryMenuItem } from '@opentiny/tiny-robot';
import { computed, ref, watch } from 'vue';
import { TinyCheckbox, TinyCheckboxGroup, TinyModal } from '@opentiny/vue';
import useTemplate from './useTemplate';
import {
  HistoryTransferToolbar,
  downloadConversations,
  getHistoryMenuItems,
  reconcileImportedConversationIds,
  type TransferConversation,
} from '../tab-components/history-transfer';
import { t } from '../../i18n';

const { isTouchDevice } = useTouchDevice();
const emit = defineEmits(['switch-template']);
const { conversationKit, templateConversationState, updateTemplateTitle, switchTemplate, deleteTemplate } =
  useTemplate();
const selectedTemplateIds = ref<string[]>([]);
const selectionActive = ref(false);
const conversations = computed(() => templateConversationState.value?.conversations ?? []);
const historyItems = computed(() =>
  conversations.value.map((item) => ({ ...item, title: item.title || t('template.defaultTitle') })),
);
const historyMenuItems = getHistoryMenuItems();

watch(selectionActive, (active) => {
  if (!active) selectedTemplateIds.value = [];
});
watch(
  () => conversations.value.map((item) => item.id),
  (ids) => {
    const idSet = new Set(ids);
    selectedTemplateIds.value = selectedTemplateIds.value.filter((id) => idSet.has(id));
  },
);

async function collectForExport(ids: string[]) {
  const kit = conversationKit.value;
  if (!kit) return [];
  const previous = kit.activeConversationId.value;
  const result: TransferConversation[] = [];
  for (const id of ids) {
    const active = await kit.switchConversation(id);
    const info = kit.conversations.value.find((item) => item.id === id);
    if (active && info) result.push({ ...info, messages: structuredClone(active.engine.messages.value) });
  }
  if (previous) await kit.switchConversation(previous);
  return result;
}

const handleImportConversations = async (imported: TransferConversation[]) => {
  const kit = conversationKit.value;
  if (!kit) return;
  const reconciled = reconcileImportedConversationIds(kit.conversations.value, imported);
  for (const item of reconciled) {
    const created = kit.createConversation({ id: item.id, title: item.title, metadata: item.metadata });
    created.engine.messages.value.splice(0, created.engine.messages.value.length, ...item.messages);
  }
};

const handleItemClick = async (item: HistoryItem) => {
  await switchTemplate(item.id);
  emit('switch-template', item);
};

const handleItemAction = async (action: HistoryMenuItem, item: HistoryItem) => {
  if (action.id === 'export') {
    downloadConversations(await collectForExport([item.id]), 'genui-template');
    return;
  }
  if (action.id === 'delete') {
    const type = await TinyModal.confirm(t('template.confirmDeleteOne'));
    if (type !== 'cancel') await deleteTemplate(item.id);
  }
};

const handleItemTitleChange = (title: string, item: HistoryItem) => updateTemplateTitle(item.id, title);
const handleBatchExport = async (ids: string[]) =>
  downloadConversations(await collectForExport(ids), 'genui-template');
const handleBatchDelete = async () => {
  const ids = [...selectedTemplateIds.value];
  if (!ids.length) return;
  const type = await TinyModal.confirm(t('template.confirmBatchDelete', { count: ids.length }));
  if (type === 'cancel') return;
  await Promise.all(ids.map(deleteTemplate));
  selectedTemplateIds.value = [];
};
</script>

<template>
  <div class="genui-template-list">
    <HistoryTransferToolbar
      v-model:selection-active="selectionActive"
      :conversations="historyItems"
      :selected-ids="selectedTemplateIds"
      @import-conversations="handleImportConversations"
      @batch-export="handleBatchExport"
      @batch-delete="handleBatchDelete"
    />
    <TinyCheckboxGroup v-model="selectedTemplateIds">
      <TrHistory
        class="tr-history-container"
        :data="historyItems"
        :selected="templateConversationState?.currentId || undefined"
        :show-rename-controls="isTouchDevice"
        :menu-items="historyMenuItems"
        :menu-list-gap="12"
        @item-action="handleItemAction"
        @item-title-change="handleItemTitleChange"
        @item-click="handleItemClick"
      >
        <template #item-prefix="{ item }">
          <TinyCheckbox
            v-if="selectionActive"
            :label="item.id"
            :value="item.id"
            text=""
            @click.stop
          />
        </template>
      </TrHistory>
    </TinyCheckboxGroup>
  </div>
</template>

<style scoped lang="less">
.genui-template-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tr-history-container {
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
