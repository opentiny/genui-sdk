<template>
  <div v-if="props.isFinished" class="assistant-footer" :class="{ 'is-last': isLastBubble }">
    <button class="footer-icon-btn" @click="handleRefresh" title="刷新">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
      </svg>
    </button>
    <button class="footer-icon-btn" @click="handleCopy" title="复制">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  index: number;
  bubbleProps: any;
  isFinished: boolean;
  messageManager: any;
}>();

const isLastBubble = computed(() => {
  const { messages } = props.messageManager;
  return props.index === messages.value.length - 1;
});

function handleCopy() {
  const content = props.bubbleProps?.content || '';
  alert(`复制消息：${content}`);
}

function handleRefresh() {
  const { messages, send } = props.messageManager;
  const messageIndex = props.index;
  messages.value = messages.value.slice(0, messageIndex);
  send();
}
</script>

<style scoped>
.assistant-footer {
  display: flex;
  align-items: center;
  gap: 4px;
  transition: opacity 0.2s ease;
}

/* 非最后一个气泡默认隐藏，悬浮时显示 */
.assistant-footer:not(.is-last) {
  opacity: 0;
}

.assistant-footer.is-last {
  opacity: 1;
}

.footer-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.2s;
}

.footer-icon-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}
</style>

<style>
/* 全局样式：悬浮到气泡内容上时显示工具栏 */
.tr-bubble__content:hover + .assistant-footer,
.assistant-footer:hover {
  opacity: 1;
}
</style>
