<template>
  <div class="history-transfer-toolbar">
    <button class="history-transfer-toolbar__button" type="button" @click="triggerImport">导入</button>
    <button
      class="history-transfer-toolbar__button"
      type="button"
      :disabled="conversations.length === 0"
      @click="exportAll"
    >
      导出
    </button>
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
import { TinyNotify } from '@opentiny/vue';
import type { Conversation } from '@opentiny/tiny-robot-kit';
import { downloadConversations, parseConversationFile, reconcileImportedConversationIds } from './history-transfer';

const props = defineProps<{
  conversations: Conversation[];
}>();

const emit = defineEmits<{
  'import-conversations': [conversations: Conversation[]];
}>();

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

const exportAll = () => {
  if (props.conversations.length === 0) {
    notify('warning', '当前没有可导出的会话');
    return;
  }

  downloadConversations(props.conversations);
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
      notify('warning', '未找到可导入的会话');
      return;
    }

    const reconciledImported = reconcileImportedConversationIds(props.conversations, importedConversations);
    emit('import-conversations', reconciledImported);
    notify('success', `已导入 ${reconciledImported.length} 条会话`);
  } catch (error) {
    const message = error instanceof Error ? error.message : '导入失败';
    notify('error', message);
  } finally {
    input.value = '';
  }
};
</script>

<style lang="less" scoped>
.history-transfer-toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 0 20px;
}

.history-transfer-toolbar__button {
  height: 28px;
  padding: 0 14px;
  border: 1px solid #d9d9d9;
  border-radius: 8px;
  background: #fff;
  color: #191919;
  font-size: 13px;
  line-height: 26px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    color 0.2s;

  &:hover:not(:disabled) {
    border-color: #7b7b7b;
    background: #f7f7f7;
  }

  &:disabled {
    color: #bfbfbf;
    cursor: not-allowed;
    background: #fafafa;
  }
}

.history-transfer-toolbar__file-input {
  display: none;
}
</style>
