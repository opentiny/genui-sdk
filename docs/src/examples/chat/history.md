# Chat 组件 - 历史会话管理

`GenuiChat` 组件内置了完整的会话管理功能，支持多会话管理、自动保存和持久化存储。通过组件暴露的 `getConversation()` 方法，你可以访问所有会话管理相关的 API。

## 基础用法

### 获取会话对象

通过组件 ref 可以访问会话管理相关方法：

```vue {12-19}
<template>
  <GenuiChat ref="chatRef" :url="url" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

// 获取会话对象
const conversation = computed(() => chatRef.value?.getConversation());

// 获取所有会话列表
const conversations = computed(() => conversation.value?.state.conversations || []);

// 获取当前会话ID
const currentId = computed(() => conversation.value?.state.currentId);
</script>
```

## 会话管理 API

通过 `getConversation()` 返回的对象，你可以使用以下方法管理会话：

### 创建新会话

```typescript
const conversation = chatRef.value?.getConversation();
const newConversationId = conversation?.createConversation('新会话标题');
```

### 切换会话

```typescript
const conversation = chatRef.value?.getConversation();
conversation?.switchConversation(conversationId);
```

### 删除会话

```typescript
const conversation = chatRef.value?.getConversation();
conversation?.deleteConversation(conversationId);
```

### 手动保存会话

```typescript
const conversation = chatRef.value?.getConversation();
await conversation?.saveConversations();
```

## 配合侧边栏管理历史记录

以下示例展示了如何在侧边栏中显示和管理历史会话：

```vue
<template>
  <div class="chat-with-sidebar">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <button class="new-chat-btn" @click="handleNewConversation">+ 新建会话</button>
      </div>
      <div class="conversations-list">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          :class="['conversation-item', { active: conv.id === currentId }]"
          @click="handleSwitchConversation(conv.id)"
        >
          <div class="conversation-title">{{ conv.title || '新会话' }}</div>
          <button class="delete-btn" @click.stop="handleDeleteConversation(conv.id)">×</button>
        </div>
      </div>
    </div>

    <!-- 聊天区域 -->
    <div class="chat-container">
      <GenuiChat ref="chatRef" :url="url" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

// 获取会话对象和状态
const conversation = computed(() => chatRef.value?.getConversation());
const conversations = computed(() => conversation.value?.state.conversations || []);
const currentId = computed(() => conversation.value?.state.currentId);

// 创建新会话
const handleNewConversation = () => {
  conversation.value?.createConversation();
};

// 切换会话
const handleSwitchConversation = (id: string) => {
  conversation.value?.switchConversation(id);
};

// 删除会话
const handleDeleteConversation = (id: string) => {
  if (confirm('确定要删除这个会话吗？')) {
    conversation.value?.deleteConversation(id);
  }
};
</script>
```

## 完整示例

<demo vue="../../../demos/chat/history.vue" />
