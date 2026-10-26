<template>
  <div class="genui-history">
    <HistoryTransferToolbar
      v-model:selection-active="selectionActive"
      :conversations="historyItems"
      :selected-ids="selectedConversations"
      @import-conversations="handleImportConversations"
      @batch-export="handleBatchExport"
      @batch-delete="handleBatchDelete"
    />
    <TinyCheckboxGroup v-model="selectedConversations">
      <TrHistory
        class="tr-history-container"
        :data="groupedHistoryData"
        :selected="activeConversationId || undefined"
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

<script setup lang="ts">
import { TrHistory, useTouchDevice, type HistoryItem, type HistoryMenuItem } from '@opentiny/tiny-robot';
import type { ConversationInfo, UseConversationReturn } from '@opentiny/tiny-robot-kit';
import {
  HistoryTransferToolbar,
  downloadConversations,
  getHistoryMenuItems,
  groupByTimeBuckets,
  reconcileImportedConversationIds,
  type TransferConversation,
} from './history-transfer';
import { TinyCheckbox, TinyCheckboxGroup, TinyModal } from '@opentiny/vue';
import { t } from '../../i18n';
import { computed, ref, watch } from 'vue';

const props = defineProps<{ conversation: UseConversationReturn }>();
const { isTouchDevice } = useTouchDevice();
const historyMenuItems = getHistoryMenuItems();
const selectedConversations = ref<string[]>([]);
const selectionActive = ref(false);

const conversations = computed(() => props.conversation.conversations.value);
const activeConversationId = computed(() => props.conversation.activeConversationId.value);
const historyItems = computed(() =>
  conversations.value.map((item) => ({ ...item, title: item.title || t('conversation.newConversation') })),
);
const groupedHistoryData = computed(() => groupByTimeBuckets(historyItems.value) as any);

watch(selectionActive, (active) => {
  if (!active) selectedConversations.value = [];
});
watch(
  () => conversations.value.map((item) => item.id),
  (ids) => {
    const idSet = new Set(ids);
    selectedConversations.value = selectedConversations.value.filter((id) => idSet.has(id));
  },
);

async function collectForExport(ids: string[]) {
  const previous = activeConversationId.value;
  const result: TransferConversation[] = [];
  for (const id of ids) {
    const active = await props.conversation.switchConversation(id);
    const info = conversations.value.find((item) => item.id === id);
    if (active && info) {
      result.push({ ...info, messages: structuredClone(active.engine.messages.value) });
    }
  }
  if (previous) await props.conversation.switchConversation(previous);
  return result;
}

const handleImportConversations = async (imported: TransferConversation[]) => {
  const reconciled = reconcileImportedConversationIds(conversations.value, imported);
  for (const item of reconciled) {
    const created = props.conversation.createConversation({
      id: item.id,
      title: item.title,
      metadata: item.metadata,
    });
    created.engine.messages.value.splice(0, created.engine.messages.value.length, ...item.messages);
  }
};

const handleItemClick = (item: HistoryItem) => props.conversation.switchConversation(item.id);

const handleItemAction = async (action: HistoryMenuItem, item: HistoryItem) => {
  if (action.id === 'export') {
    downloadConversations(await collectForExport([item.id]));
    return;
  }
  if (action.id !== 'delete') return;
  await props.conversation.deleteConversation(item.id);
  if (!conversations.value.length) {
    props.conversation.createConversation({ title: t('conversation.newConversation') });
  }
};

const handleItemTitleChange = (title: string, item: HistoryItem) =>
  props.conversation.updateConversationTitle(item.id, title);

const handleBatchExport = async (ids: string[]) => {
  downloadConversations(await collectForExport(ids));
};

const handleBatchDelete = () => {
  const ids = [...selectedConversations.value];
  if (!ids.length) return;
  TinyModal.confirm(t('conversation.confirmBatchDelete', { count: ids.length })).then(
    async (type: 'confirm' | 'cancel') => {
      if (type === 'cancel') return;
      await Promise.all(ids.map((id) => props.conversation.deleteConversation(id)));
      selectedConversations.value = [];
      if (!conversations.value.length) {
        props.conversation.createConversation({ title: t('conversation.newConversation') });
      }
    },
  );
};
</script>

<style lang="less" scoped>
.genui-history {
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
</style>
