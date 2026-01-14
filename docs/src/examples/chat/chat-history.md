# Chat 组件 - 历史会话管理

`GenuiChat` 组件支持历史会话管理，允许你保存、加载和管理对话历史。

## 基础用法

### 初始化会话历史

通过 `messages` prop 可以初始化对话历史：

```vue
<template>
  <GenuiChat
    :url="url"
    :messages="initialMessages"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const initialMessages = [
  {
    role: 'user',
    content: '你好',
    messages: [
      {
        type: 'text',
        content: '你好'
      }
    ]
  },
  {
    role: 'assistant',
    content: '你好！有什么可以帮助你的吗？',
    messages: [
      {
        type: 'text',
        content: '你好！有什么可以帮助你的吗？'
      }
    ]
  }
];
</script>
```

## 保存会话历史

### 使用本地存储

```vue
<template>
  <GenuiChat
    ref="chatRef"
    :url="url"
    :messages="messages"
    @update:messages="handleMessagesUpdate"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

const STORAGE_KEY = 'genui-chat-history';

// 从本地存储加载历史
const messages = ref(() => {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
});

// 保存到本地存储
function saveMessages(newMessages: any[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newMessages));
  messages.value = newMessages;
}

// 监听消息更新（注意：GenuiChat 可能不直接暴露这个事件）
// 可以通过其他方式获取消息，比如通过 ref 访问内部状态
</script>
```

### 使用后端 API

```vue
<template>
  <GenuiChat
    ref="chatRef"
    :url="url"
    :messages="messages"
  />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);
const sessionId = ref<string | null>(null);

const messages = ref<any[]>([]);

// 从后端加载历史
async function loadHistory() {
  if (!sessionId.value) return;
  
  try {
    const response = await fetch(`https://your-api.com/sessions/${sessionId.value}/messages`);
    const data = await response.json();
    messages.value = data.messages || [];
  } catch (error) {
    console.error('加载历史失败:', error);
  }
}

// 保存到后端
async function saveHistory(newMessages: any[]) {
  if (!sessionId.value) return;
  
  try {
    await fetch(`https://your-api.com/sessions/${sessionId.value}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMessages })
    });
  } catch (error) {
    console.error('保存历史失败:', error);
  }
}

onMounted(() => {
  // 创建新会话或加载现有会话
  sessionId.value = 'session-123';
  loadHistory();
});
</script>
```

## 清空会话

```vue
<template>
  <div>
    <GenuiChat
      ref="chatRef"
      :url="url"
      :messages="messages"
    />
    <button @click="clearConversation">清空会话</button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);
const messages = ref<any[]>([]);

function clearConversation() {
  chatRef.value?.clearConversation();
  messages.value = [];
  // 同时清除本地存储
  localStorage.removeItem('genui-chat-history');
}
</script>
```

## 多会话管理

```vue
<template>
  <div class="chat-app">
    <div class="sidebar">
      <button @click="createNewSession">新建会话</button>
      <div class="session-list">
        <div
          v-for="session in sessions"
          :key="session.id"
          :class="['session-item', { active: currentSessionId === session.id }]"
          @click="switchSession(session.id)"
        >
          <div class="session-title">{{ session.title }}</div>
          <div class="session-time">{{ formatTime(session.updatedAt) }}</div>
        </div>
      </div>
    </div>
    <div class="chat-container">
      <GenuiChat
        ref="chatRef"
        :url="url"
        :messages="currentMessages"
        :key="currentSessionId"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

interface Session {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
  updatedAt: number;
}

const sessions = ref<Session[]>([]);
const currentSessionId = ref<string | null>(null);

const currentMessages = computed(() => {
  const session = sessions.value.find(s => s.id === currentSessionId.value);
  return session?.messages || [];
});

function createNewSession() {
  const newSession: Session = {
    id: `session-${Date.now()}`,
    title: '新会话',
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  sessions.value.unshift(newSession);
  currentSessionId.value = newSession.id;
}

function switchSession(sessionId: string) {
  currentSessionId.value = sessionId;
}

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 从本地存储加载会话列表
function loadSessions() {
  const saved = localStorage.getItem('genui-sessions');
  if (saved) {
    sessions.value = JSON.parse(saved);
    if (sessions.value.length > 0) {
      currentSessionId.value = sessions.value[0].id;
    }
  }
}

// 保存会话列表
function saveSessions() {
  localStorage.setItem('genui-sessions', JSON.stringify(sessions.value));
}

// 监听会话变化
watch(sessions, saveSessions, { deep: true });
</script>

<style scoped>
.chat-app {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 250px;
  border-right: 1px solid #eee;
  padding: 16px;
  overflow-y: auto;
}

.session-list {
  margin-top: 16px;
}

.session-item {
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  margin-bottom: 8px;
  transition: background 0.2s;
}

.session-item:hover {
  background: #f5f5f5;
}

.session-item.active {
  background: #e3f2fd;
}

.session-title {
  font-weight: 500;
  margin-bottom: 4px;
}

.session-time {
  font-size: 12px;
  color: #999;
}

.chat-container {
  flex: 1;
}
</style>
```

## 完整示例

<demo vue="../../../demos/chat/history.vue" />

## 注意事项

1. **消息格式**：确保保存和加载的消息格式与 `GenuiChat` 期望的格式一致
2. **存储限制**：本地存储有大小限制（通常 5-10MB），大量历史可能需要使用后端存储
3. **数据安全**：敏感信息不应该存储在本地，应该使用后端存储
4. **性能考虑**：大量历史消息可能影响性能，考虑实现分页或懒加载
5. **会话同步**：如果需要在多个设备间同步，应该使用后端 API
