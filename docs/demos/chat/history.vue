<template>
  <div class="chat-with-history">
    <div class="toolbar">
      <button @click="saveCurrentSession">保存会话</button>
      <button @click="loadSession">加载会话</button>
      <button @click="clearSession">清空会话</button>
      <button @click="exportSession">导出会话</button>
    </div>
    <GenuiChat
      ref="chatRef"
      :url="url"
      :messages="messages"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);
const messages = ref<any[]>([]);

const STORAGE_KEY = 'genui-chat-session';

onMounted(() => {
  loadSession();
});

function saveCurrentSession() {
  // 注意：需要根据实际 API 获取当前消息
  // 这里假设可以通过某种方式获取
  const sessionData = {
    messages: messages.value,
    savedAt: Date.now()
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
  alert('会话已保存');
}

function loadSession() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const sessionData = JSON.parse(saved);
    messages.value = sessionData.messages || [];
  }
}

function clearSession() {
  chatRef.value?.clearConversation();
  messages.value = [];
  localStorage.removeItem(STORAGE_KEY);
}

function exportSession() {
  const sessionData = {
    messages: messages.value,
    exportedAt: Date.now()
  };
  const blob = new Blob([JSON.stringify(sessionData, null, 2)], {
    type: 'application/json'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-session-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.chat-with-history {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.toolbar {
  padding: 12px;
  border-bottom: 1px solid #eee;
  display: flex;
  gap: 8px;
}

.toolbar button {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
}

.toolbar button:hover {
  background: #f5f5f5;
}
</style>

