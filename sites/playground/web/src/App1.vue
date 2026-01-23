<template>
  <div class="app-container">
    <GenuiChat
      ref="chat"
      url="http://localhost:3100/"
      :customFetch="defaultCustomFetch"
      model="deepseek-v3.2"
      :temperature="0.5"
      :chat-config="config"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import { defaultCustomFetch } from './api2/custom-fetch';

const config = {
  addToolCallContext: true,
  showThinkingResult: true,
};

const chat = ref()

onMounted(() => {
  // @ts-ignore
  window.chat = chat.value?.getConversation()
});
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
}
</style>
