<template>
  <div class="chat-container">
    <GenuiChat :url="url" :features="modelFeatures" model="gpt-4-vision-preview" :messages="messages" />
  </div>
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const messages = [
  {
    role: 'user',
    content: [
      { type: 'image', filename: 'circle.png', image: 'data:image/png;base64,XXXXXXXXXXX' },
      { type: 'text', text: '分析一下这张图片' },
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
            'content': '帮我分析一下这张图片',
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
    content: '这张图片是一个红色的圆形',
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
