<template>
  <div class="user-footer-wrapper">
    <div class="user-actions">
      <button class="footer-icon-btn" @click="handleEdit" title="编辑">
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
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
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
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  index: number;
  bubbleProps: any;
  messageManager: any;
}>();

function handleEdit() {
  const content = props.bubbleProps?.content || '';
  alert(`编辑当前问题：${content}`);
}

function handleCopy() {
  const content = props.bubbleProps?.content || '';
  alert(`复制消息：${content}`);
}
</script>

<style scoped>
.user-footer-wrapper {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  width: auto;
  max-width: 100%;
}

.user-actions {
  display: inline-flex;
  gap: 4px;
  opacity: 0;
  transition: all 0.2s ease;
  background: #ffffff;
  border-radius: 12px;
  padding: 4px;
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
.tr-bubble__content:hover + .user-footer-wrapper > .user-actions,
.user-actions:hover {
  opacity: 1;
}
</style>

