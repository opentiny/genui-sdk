# Chat Component - Conversation History Management

The `GenuiChat` component includes full conversation management with multi-conversation support, auto-save, and persistent storage. Use the exposed `getConversation()` method to access all conversation management APIs.

## Basic Usage

### Getting the Conversation Object

Access conversation management methods via a component ref:

```vue {12-19}
<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat ref="chatRef" :url="url" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { ref, computed } from 'vue';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

// Get the conversation object
const conversation = computed(() => chatRef.value?.getConversation());

// Get all conversations
const conversations = computed(() => conversation.value?.state.conversations || []);

// Get the current conversation ID
const currentId = computed(() => conversation.value?.state.currentId);
</script>
```

## Conversation Management API

Use the object returned by `getConversation()` to manage conversations:

### Create a New Conversation

```typescript
const conversation = chatRef.value?.getConversation();
const newConversationId = conversation?.createConversation('New Conversation Title');
```

### Switch Conversation

```typescript
const conversation = chatRef.value?.getConversation();
conversation?.switchConversation(conversationId);
```

### Delete Conversation

```typescript
const conversation = chatRef.value?.getConversation();
conversation?.deleteConversation(conversationId);
```

### Manually Save Conversations

```typescript
const conversation = chatRef.value?.getConversation();
await conversation?.saveConversations();
```

## Managing History with a Sidebar

The following example shows how to display and manage conversation history in a sidebar:

```vue
<template>
  <GenuiConfigProvider :materials="materials">
    <div class="chat-with-sidebar">
      <!-- Sidebar -->
      <div class="sidebar">
        <div class="sidebar-header">
          <button class="new-chat-btn" @click="handleNewConversation">+ New Conversation</button>
        </div>
        <div class="conversations-list">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            :class="['conversation-item', { active: conv.id === currentId }]"
            @click="handleSwitchConversation(conv.id)"
          >
            <div class="conversation-title">{{ conv.title || 'New Conversation' }}</div>
            <button class="delete-btn" @click.stop="handleDeleteConversation(conv.id)">×</button>
          </div>
        </div>
      </div>

      <!-- Chat area -->
      <div class="chat-container">
        <GenuiChat ref="chatRef" :url="url" />
      </div>
    </div>
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { ref, computed } from 'vue';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

// Get conversation object and state
const conversation = computed(() => chatRef.value?.getConversation());
const conversations = computed(() => conversation.value?.state.conversations || []);
const currentId = computed(() => conversation.value?.state.currentId);

// Create a new conversation
const handleNewConversation = () => {
  conversation.value?.createConversation();
};

// Switch conversation
const handleSwitchConversation = (id: string) => {
  conversation.value?.switchConversation(id);
};

// Delete conversation
const handleDeleteConversation = (id: string) => {
  if (confirm('Are you sure you want to delete this conversation?')) {
    conversation.value?.deleteConversation(id);
  }
};
</script>
```

## Full Example

<demo vue="../../../../demos/en/chat/history.vue" />
