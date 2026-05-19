<template>
  <div class="genui-history">
    <history-transfer-toolbar
      :conversations="state.conversations"
      @import-conversations="handleImportConversations"
    />
    <tr-history
      class="tr-history-container"
      :data="state.conversations"
      :selected="state.currentId || undefined"
      :show-rename-controls="isTouchDevice"
      :menu-items="historyMenuItems"
      :menu-list-gap="12"
      @item-action="handleItemAction"
      @item-title-change="handleItemTitleChange"
      @item-click="handleItemClick"
    />
  </div>
</template>

<script setup lang="ts">
import { TrHistory, useTouchDevice } from '@opentiny/tiny-robot';
import { type Conversation, type UseConversationReturn } from '@opentiny/tiny-robot-kit';
import { HistoryTransferToolbar, downloadConversations, historyMenuItems } from './history-transfer';

const { isTouchDevice } = useTouchDevice();

const props = defineProps<{
  conversation: UseConversationReturn;
}>();

const { state, switchConversation, deleteConversation, updateTitle, createConversation, saveConversations } =
  props.conversation;

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
</script>

<style lang="less" scoped>
.genui-history {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tr-history-container {
  padding: 0 20px;

  --tr-history-empty-padding: calc((100vh - 380px) / 2) 0;
  --tr-history-empty-padding: calc((100dvh - 380px) / 2) 0;
  :deep(.tr-history__item.selected) {
    background-color: #f2f0f0;
  }
}
</style>
