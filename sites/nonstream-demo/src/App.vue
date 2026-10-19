<template>
  <div class="app">
    <div class="toolbar">
      <label class="field">
        <input
          type="checkbox"
          :checked="isStream"
          @change="toggleStream(($event.target as HTMLInputElement).checked)"
        />
        <span>流式响应</span>
      </label>
      <code class="mode">{{ isStream ? 'stream: true' : 'stream: false' }}</code>

      <label class="field">
        <span>模型</span>
        <input v-model="model" class="model-input" placeholder="deepseek-chat" />
      </label>

      <button type="button" @click="clearConversation">清空对话</button>

      <span class="hint">后端 {{ url }}</span>
    </div>

    <div class="chat">
      <GenuiConfigProvider :materials="materials">
        <GenuiChat :key="chatKey" :url="url" :model="model" :stream="isStream" />
      </GenuiConfigProvider>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';

// genui-server 挂了 cors()，直接用绝对地址跨域请求，不需要 vite proxy。
// 用 || 而不是 ??：env 里写成空串时也要能回落到默认值。
const url = import.meta.env.VITE_CHAT_URL || 'http://localhost:3100/chat/completions';
const model = ref(import.meta.env.VITE_MODEL || 'deepseek-chat');

// 默认非流式 —— 这个 demo 就是来看非流式的
const isStream = ref(false);

// 换 key 会重建 GenuiChat。两个原因：
// 1. `stream` 只在 setup 时读一次（GenuiChat.vue 传给 useStreamByDefault，
//    useMessage 里是 ref(...)），运行中改 prop 不会生效；
// 2. 重建能拿到干净的组件状态。
const chatKey = ref(0);

function toggleStream(next: boolean) {
  isStream.value = next;
  chatKey.value += 1;
}

async function clearConversation() {
  await clearStoredConversations();
  chatKey.value += 1;
}

/**
 * 清掉 GenuiChat 持久化的对话历史，然后重建组件。
 * 光重建是清不掉的 —— 组件启动时会把上次的对话从 IndexedDB 读回来。
 * 库名/表名/键名对齐 packages/frameworks/vue/src/chat/tiny-robot-patch/indexedDBStrategy.ts 的默认值。
 */
function clearStoredConversations(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve();
      return;
    }

    const request = indexedDB.open('genui-ai', 1);
    request.onerror = () => resolve();
    request.onsuccess = () => {
      const db = request.result;
      try {
        const tx = db.transaction('conversations', 'readwrite');
        tx.objectStore('conversations').delete('conversations-list');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => {
          db.close();
          resolve();
        };
      } catch {
        db.close();
        resolve();
      }
    };
  });
}
</script>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 12px;
  border-bottom: 1px solid #e5e5e5;
  font-size: 13px;
}

.field {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.mode {
  padding: 2px 8px;
  border-radius: 4px;
  background: #f2f2f2;
  font-size: 12px;
}

.model-input {
  width: 180px;
  padding: 3px 6px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}

.hint {
  margin-left: auto;
  color: #999;
  font-size: 12px;
}

/* min-height: 0 必须有，否则 flex 子项撑不住，GenuiChat 会塌成 0 高 */
.chat {
  flex: 1;
  min-height: 0;
}
</style>
