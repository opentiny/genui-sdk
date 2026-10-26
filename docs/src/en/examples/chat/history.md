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
const conversations = computed(() => conversation.value?.conversations.value || []);

// Get the current conversation ID
const currentId = computed(() => conversation.value?.activeConversationId.value);
</script>
```

## Conversation Management API

Use the object returned by `getConversation()` to manage conversations:

### Create a New Conversation

```typescript
const conversation = chatRef.value?.getConversation();
const newConversation = conversation?.createConversation({ title: 'New Conversation Title' });
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

### Auto-save

Conversations and messages are saved automatically by default; no manual save call is needed.
You can disable or re-enable message auto-save at runtime with
`<GenuiChat :auto-save-messages="enabled" />`.

::: warning Upgrade note
TinyRobot 1.0 uses a new conversation storage format. History written to IndexedDB by 0.3.3
is not migrated automatically. Export old data before upgrading and migrate it through a
custom `conversationStorage` if it must be retained.
:::

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
const conversations = computed(() => conversation.value?.conversations.value || []);
const currentId = computed(() => conversation.value?.activeConversationId.value);

// Create a new conversation
const handleNewConversation = () => {
  conversation.value?.createConversation({ title: 'New Conversation' });
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
