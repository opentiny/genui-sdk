<template>
  <div class="chat-container">
    <GenuiChat
      :url="url"
      :features="modelFeatures"
      :llmConfig="llmConfig"
    />
  </div>
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const modelFeatures = {
  supportImage: {
    enabled: true,
    maxImageSize: 10,
    maxFilesPerRequest: 3,
    supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  },
  supportFunctionCalling: true
};

const llmConfig = {
  model: 'gpt-4-vision-preview',
  temperature: 0.7
};
</script>

<style scoped>
.chat-container {
  width: 100%;
  height: 100vh;
}
</style>

