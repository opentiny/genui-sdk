<template>
  <div class="message-footer">
    <div class="footer-left">
      <span v-if="bubble?.timestamp" class="timestamp">
        {{ formatTime(bubble.timestamp) }}
      </span>
    </div>
    <div class="footer-right">
      <button 
        v-if="canCopy" 
        @click="handleCopy"
        class="footer-btn"
        title="复制"
      >
        复制
      </button>
      <button 
        v-if="isUserMessage && canEdit" 
        @click="handleEdit"
        class="footer-btn"
        title="编辑"
      >
        编辑
      </button>
      <button 
        @click="handleDelete"
        class="footer-btn danger"
        title="删除"
      >
        删除
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BubbleProps } from '@opentiny/tiny-robot';
import { computed } from 'vue';

const props = defineProps<BubbleProps>();

const isUserMessage = computed(() => {
  return props.bubble?.role === 'user';
});

const canCopy = computed(() => {
  return !!props.bubble?.content;
});

const canEdit = computed(() => {
  return isUserMessage.value;
});

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function handleCopy() {
  const text = props.bubble?.content || '';
  if (text) {
    navigator.clipboard.writeText(text).then(() => {
      console.log('已复制到剪贴板');
      // 可以显示提示
    });
  }
}

function handleEdit() {
  // 触发编辑事件
  console.log('编辑消息:', props.bubble?.id);
}

function handleDelete() {
  // 触发删除事件
  console.log('删除消息:', props.bubble?.id);
}
</script>

<style scoped>
.message-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-top: 1px solid #eee;
  margin-top: 8px;
  font-size: 12px;
}

.footer-left {
  color: #999;
}

.timestamp {
  font-size: 11px;
}

.footer-right {
  display: flex;
  gap: 4px;
}

.footer-btn {
  padding: 2px 8px;
  font-size: 11px;
  border: 1px solid #ddd;
  border-radius: 3px;
  background: white;
  cursor: pointer;
  color: #666;
  transition: all 0.2s;
}

.footer-btn:hover {
  background: #f5f5f5;
  border-color: #bbb;
}

.footer-btn.danger {
  color: #f56c6c;
}

.footer-btn.danger:hover {
  background: #fee;
  border-color: #f56c6c;
}
</style>

