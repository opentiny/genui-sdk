<template>
  <GenuiConfigProvider :materials="materials">
    <div class="chat-with-sidebar">
      <!-- Sidebar -->
      <div class="sidebar">
        <div class="sidebar-header">
          <button class="new-chat-btn" @click="handleNewConversation">+ New Chat</button>
        </div>
        <div class="conversations-list" v-if="conversations.length > 0">
          <div
            v-for="conv in conversations"
            :key="conv.id"
            :class="['conversation-item', { active: conv.id === currentId }]"
            @click="handleSwitchConversation(conv.id)"
          >
            <div class="conversation-title">{{ conv.title || 'New Chat' }}</div>
            <button class="delete-btn" @click.stop="handleDeleteConversation(conv.id)">×</button>
          </div>
        </div>
        <div class="empty-conversations" v-else>
          <p>No conversations yet</p>
          <p class="hint">Click the button above to create a new chat</p>
        </div>
      </div>

      <!-- Chat Area -->
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

// Create new conversation
const handleNewConversation = () => {
  conversation.value?.createConversation({ title: 'New Conversation' });
};

// Switch conversation
const handleSwitchConversation = (id: string) => {
  conversation.value?.switchConversation(id);
};

// Delete conversation
const handleDeleteConversation = (id: string) => {
  conversation.value?.deleteConversation(id);
};
</script>

<style scoped>
.chat-with-sidebar {
  display: flex;
  height: 100vh;
  background: #fff;
}

.sidebar {
  width: 200px;
  border-right: 1px solid #e5e5e5;
  display: flex;
  flex-direction: column;
  background: #f9f9f9;
}

.sidebar-header {
  padding: 12px;
  border-bottom: 1px solid #e5e5e5;
}

.new-chat-btn {
  width: 100%;
  padding: 8px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.new-chat-btn:hover {
  background: #0056b3;
}

.conversations-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.conversation-item {
  padding: 10px;
  margin-bottom: 2px;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.conversation-item:hover {
  background: #f0f0f0;
}

.conversation-item.active {
  background: #e3f2fd;
}

.conversation-title {
  font-size: 13px;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.delete-btn {
  width: 20px;
  height: 20px;
  background: transparent;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  opacity: 0;
  padding: 0;
}

.conversation-item:hover .delete-btn {
  opacity: 1;
}

.delete-btn:hover {
  color: #f44336;
}

.empty-conversations {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: #999;
  text-align: center;
  font-size: 13px;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>
