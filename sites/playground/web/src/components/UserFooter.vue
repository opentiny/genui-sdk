<script lang="ts" setup>
import { ref, computed, inject } from 'vue';
import { GENUI_CONFIG } from '@opentiny/genui-sdk-vue';
import { IconEdit, iconCopy } from '@opentiny/vue-icon';
import { TinyButton } from '@opentiny/vue';
import { AutoTip } from '@opentiny/vue-directive';
import copy from 'clipboard-copy';
import type { IBubbleSlotsProps } from './common.types';
import EditInputRenderer from './EditInputRenderer.vue';
import { t } from '../i18n';

const props = defineProps<IBubbleSlotsProps>();
const generating = computed(() => props.messageEngine.isProcessing.value);
const genuiConfig: any = inject(GENUI_CONFIG, null);

const tooltipEffect = computed(() => {
  return genuiConfig?.value?.colorScheme === 'dark' ? 'dark' : 'light';
});


const vAutoTip = AutoTip;

const EditIcon = IconEdit();
const CopyIcon = iconCopy();

const isEditing = ref(false);
const editingContent = ref('');

// 获取消息内容
const messageContent = computed(() => {
  const content = props.messages.at(-1)?.content;
  if (typeof content === 'string') {
    return content;
  } else if (content && typeof content === 'object') {
    if (Array.isArray(content)) {
      const textItem = content.find((item: any) => item.type === 'text' || item.text);
      return textItem?.text || JSON.stringify(content);
    }
    return JSON.stringify(content);
  }
  return '';
});


const handleCopyMessageByIndex = async () => {
  const content = props.messages.at(-1)?.content;
  let copyContent: string;
  if (typeof content === 'string') {
    copyContent = content;
  } else {
    copyContent = JSON.stringify(content);
  }
  try {
    await copy(copyContent);
  } catch (error) {
    console.error('复制失败', error);
  }
};

// 开始编辑
const handleStartEditByIndex = () => {
  editingContent.value = messageContent.value;
  isEditing.value = true;
};

// 保存编辑
const handleSaveEdit = () => {
  const { messages, send } = props.messageEngine;
  const messageIndex = props.messageIndexes.at(-1) ?? -1;
  const content = editingContent.value;
  messages.value[messageIndex].content = content;
  messages.value = messages.value.slice(0, messageIndex + 1);
  isEditing.value = false;
  send();
};

// 取消编辑
const handleCancelEdit = () => {
  isEditing.value = false;
  editingContent.value = '';
};
</script>

<template>
  <div class="user-footer-wrapper" :class="{ 'is-editing': isEditing }">

    <EditInputRenderer v-if="isEditing" v-model="editingContent" @save="handleSaveEdit" @cancel="handleCancelEdit" />

    <div v-if="!isEditing" class="user-actions">
      <!-- 编辑按钮 -->
      <tiny-button
        v-if="!generating"
        :reset-time="0"
        type="text"
        :icon="EditIcon"
        v-auto-tip="{ always: true, content: t('common.edit'), effect: tooltipEffect }"
        @click="handleStartEditByIndex"
      >
      </tiny-button>
      <!-- 复制按钮 -->
      <tiny-button
        type="text"
        :reset-time="0"
        :icon="CopyIcon"
        v-auto-tip="{ always: true, content: t('chatFooter.copy'), effect: tooltipEffect }"
        @click="handleCopyMessageByIndex"
      >
      </tiny-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.user-footer-wrapper {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  width: auto;
  max-width: 100%;

  &.is-editing {
    width: 100%;
  }
}

.user-actions {
  display: inline-flex;
  gap: 4px;
  opacity: 0;
  transition: all 0.2s ease;
  background: var(--tr-container-bg-default);
  border-radius: 12px;
  padding: 4px;
}
</style>

<style lang="scss">
.tr-bubble[data-role='user']:hover .user-footer-wrapper .user-actions,
.user-footer-wrapper .user-actions:hover {
  opacity: 1;
}

.tr-bubble:has(.user-footer-wrapper.is-editing) .tr-bubble__content {
  display: none;
}
</style>
