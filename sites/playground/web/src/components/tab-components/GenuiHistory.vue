<template>
  <div class="genui-history">
    <history-transfer-toolbar
      v-model:selection-active="selectionActive"
      :conversations="state.conversations"
      :selected-ids="selectedConversations"
      @import-conversations="handleImportConversations"
      @batch-export="handleBatchExport"
      @batch-delete="handleBatchDelete"
    />
    <tiny-checkbox-group v-model="selectedConversations">
      <tr-history
        class="tr-history-container"
        :data="groupedHistoryData"
        :selected="state.currentId || undefined"
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

<script setup lang="ts">
import { TrHistory, useTouchDevice } from '@opentiny/tiny-robot';
import { type Conversation, type UseConversationReturn } from '@opentiny/tiny-robot-kit';
import { HistoryTransferToolbar, downloadConversations, getHistoryMenuItems, groupByTimeBuckets } from './history-transfer';
import { TinyCheckbox, TinyCheckboxGroup, TinyModal } from '@opentiny/vue';
import { t } from '../../i18n';
import { computed, ref, watch } from 'vue';

const { isTouchDevice } = useTouchDevice();

const historyMenuItems = getHistoryMenuItems();

const selectedConversations = ref<string[]>([]);
const selectionActive = ref(false);

watch(selectionActive, (active) => {
  if (!active) {
    selectedConversations.value = [];
  }
});

const props = defineProps<{
  conversation: UseConversationReturn;
}>();

const { state, switchConversation, deleteConversation, updateTitle, createConversation, saveConversations } =
  props.conversation;

const groupedHistoryData = computed(() => groupByTimeBuckets(state.conversations));

watch(
  () => state.conversations.map((c) => c.id),
  () => {
    const idSet = new Set(state.conversations.map((c) => c.id));
    selectedConversations.value = selectedConversations.value.filter((id) => idSet.has(id));
  },
);

const handleImportConversations = (conversations: Conversation[]) => {
  state.conversations.unshift(...conversations);
  saveConversations();
};

const handleItemClick = (item: Conversation) => {
  switchConversation(item.id);
};

const handleItemAction = (action: { id: string }, item: Conversation) => {
  if (action.id === 'export') {
    downloadConversations([item]);
    return;
  }

  if (action.id === 'delete') {
    deleteConversation(item.id);
    saveConversations();
  }

  // 保证至少有一个会话
  if (state.conversations.length === 0) {
    createConversation();
    saveConversations();
  }
};

const handleItemTitleChange = (title: string, item: Conversation) => {
  updateTitle(item.id, title);
  saveConversations();
};

const handleBatchExport = () => {
  const idSet = new Set(selectedConversations.value);
  const items = state.conversations.filter((c) => idSet.has(c.id));
  downloadConversations(items);
};

const handleBatchDelete = () => {
  const ids = [...selectedConversations.value];
  if (ids.length === 0) {
    return;
  }
  TinyModal.confirm(t('conversation.confirmBatchDelete', { count: ids.length }))
    .then((type: 'confirm' | 'cancel') => {
      if (type === 'cancel') {
        return;
      }
      for (const id of ids) {
        deleteConversation(id);
      }
      selectedConversations.value = [];
      if (state.conversations.length === 0) {
        createConversation();
      }
      saveConversations();
    });
};
</script>

<style lang="less" scoped>
.genui-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tr-history-container {
  --tr-history-empty-padding: calc((100vh - 380px) / 2) 0;
  --tr-history-empty-padding: calc((100dvh - 380px) / 2) 0;
  width: 100%;
  :deep(.tr-history__item.selected) {
    background-color: #f2f0f0;
  }
}
</style>
