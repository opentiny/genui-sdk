<template>
  <div class="genui-history">
    <history-transfer-toolbar
      v-model:selection-active="selectionActive"
      :conversations="conversations"
      :selected-ids="selectedConversations"
      :export-conversations="exportConversations"
      @import-conversations="handleImportConversations"
      @batch-export="handleBatchExport"
      @batch-delete="handleBatchDelete"
    />
    <tiny-checkbox-group v-model="selectedConversations">
      <tr-history
        class="tr-history-container"
        :data="groupedHistoryData"
        :selected="currentId || undefined"
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
import { TrHistory, useTouchDevice, type HistoryItem } from '@opentiny/tiny-robot';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import type { ExportConversationItem, GenuiConversationHandle, ImportConversationItem } from '@opentiny/genui-sdk-vue';
import { HistoryTransferToolbar, downloadConversations, getHistoryMenuItems, groupByTimeBuckets } from './history-transfer';
import type { PersistedConversation } from '../../types/conversation';
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
  conversation: GenuiConversationHandle;
  importConversations: (items: ImportConversationItem[]) => Promise<void>;
  exportConversations: (ids?: string[]) => Promise<ExportConversationItem[] | undefined>;
}>();

const conversations = computed(() => props.conversation.conversations.value);
const currentId = computed(() => props.conversation.activeConversationId.value);

const groupedHistoryData = computed(() => groupByTimeBuckets(conversations.value));

watch(
  () => conversations.value.map((c) => c.id),
  () => {
    const idSet = new Set(conversations.value.map((c) => c.id));
    selectedConversations.value = selectedConversations.value.filter((id) => idSet.has(id));
  },
);

const handleImportConversations = async (items: PersistedConversation[]) => {
  await props.importConversations(
    items.map((item) => ({
      id: item.id,
      title: item.title,
      messages: item.messages as ChatMessage[] | undefined,
      metadata: item.metadata,
    })),
  );
};

const handleItemClick = (item: HistoryItem) => {
  void props.conversation.switchConversation(item.id);
};

const handleItemAction = async (action: { id: string }, item: HistoryItem) => {
  if (action.id === 'export') {
    const items = await props.exportConversations([item.id]);
    if (items?.length) {
      downloadConversations(items);
    }
    return;
  }

  if (action.id === 'delete') {
    void props.conversation.deleteConversation(item.id);
  }

  if (conversations.value.length === 0) {
    props.conversation.createConversation({ title: t('conversation.newConversation') });
  }
};

const handleItemTitleChange = (title: string, item: HistoryItem) => {
  props.conversation.updateConversationTitle(item.id, title);
};

const handleBatchExport = async () => {
  const items = await props.exportConversations([...selectedConversations.value]);
  if (items?.length) {
    downloadConversations(items);
  }
};

const handleBatchDelete = () => {
  const ids = [...selectedConversations.value];
  if (ids.length === 0) {
    return;
  }
  TinyModal.confirm(t('history.confirmBatchDelete', { count: ids.length }))
    .then((type: 'confirm' | 'cancel') => {
      if (type === 'cancel') {
        return;
      }
      for (const id of ids) {
        void props.conversation.deleteConversation(id);
      }
      selectedConversations.value = [];
      if (conversations.value.length === 0) {
        props.conversation.createConversation({ title: t('conversation.newConversation') });
      }
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
