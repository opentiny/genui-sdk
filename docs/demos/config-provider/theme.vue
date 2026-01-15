<template>
  <div class="app">
    <header class="app-header">
      <h1>GenUI Chat</h1>
      <div class="header-actions">
        <button @click="toggleTheme" class="theme-toggle">
          {{ themeIcon }}
        </button>
      </div>
    </header>
    
    <ConfigProvider :theme="currentTheme" id="main-chat">
      <GenuiChat :url="url" />
    </ConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const STORAGE_KEY = 'genui-theme';


const currentTheme = ref<'dark' | 'lite' | 'default'>('default');

const themeIcon = computed(() => {
  const icons = {
    default: '☀️',
    dark: '🌙',
  };
  return icons[currentTheme.value];
});

function toggleTheme() {
  currentTheme.value = currentTheme.value === 'dark' ? 'default' : 'dark';
}

</script>

<style scoped>
.app {
  display: flex;
  flex-direction: column;
  height: 800px;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.app-header h1 {
  margin: 0;
  font-size: 20px;
}

.theme-toggle {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 20px;
}

.theme-toggle:hover {
  background: #f5f5f5;
}
</style>

