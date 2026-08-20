<template>
  <GenuiConfigProvider :materials="materials">
    <div class="chat-container">
      <GenuiChat :url="url" :features="modelFeatures" :messages="messages" />
    </div>
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const messages = [
  {
    role: 'user',
    content: [
      { type: 'image_url', filename: 'circle.png', image_url: { url: 'data:image/png;base64,XXXXXXXXXXX' } },
      { type: 'text', text: 'Analyze this image' },
    ],
    messages: [
      {
        'type': 'templateData',
        'templateData': [
          {
            'id': 'req7r67to4e',
            'type': 'template',
            'content': 'circle.png',
          },
          {
            'id': '7ctwci3stwj',
            'type': 'text',
            'content': 'Please analyze this image for me',
          },
        ],
        'attachments': [
          {
            'name': 'circle.png',
            'type': 'image/png',
            'size': 50,
            'lastModified': 1768449231945,
            'base64':
              'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="red"/></svg>',
          },
        ],
      },
    ],
  },
  {
    role: 'assistant',
    content: 'This image shows a red circle',
  },
];

const modelFeatures = {
  supportImage: {
    enabled: true,
    maxImageSize: 10,
    maxFilesPerRequest: 3,
    supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
};
</script>

<style scoped>
.chat-container {
  width: 100%;
  height: 400px;
}
</style>
