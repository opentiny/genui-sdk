<template>
  <div class="chat-with-sidebar">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <button class="new-chat-btn" @click="handleNewConversation">+ 新建会话</button>
      </div>
      <div class="conversations-list" v-if="conversations.length > 0">
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
      <div class="empty-conversations" v-else>
        <p>暂无会话记录</p>
        <p class="hint">点击上方按钮创建新会话</p>
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
