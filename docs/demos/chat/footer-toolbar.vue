<template>
  <GenuiChat
    :url="url"
    :rendererSlots="rendererSlots"
    :messages="messages"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import { h } from 'vue';
import MessageFooter from './components/MessageFooter.vue';

const url = 'https://your-chat-backend/api';

const rendererSlots = {
  footer: (props: any) => h(MessageFooter, props)
};

// 默认消息，用于展示自定义底部工具栏
const messages = [
  {
    role: 'user',
    content: '这是一条用户消息',
    messages: [
      {
        type: 'text',
        content: '这是一条用户消息'
      }
    ]
  },
  {
    role: 'assistant',
    content: '',
    messages: [
      {
        type: 'schema-card',
        content: JSON.stringify({
          componentName: 'Page',
          children: [
            {
              componentName: 'Text',
              props: {
                text: '这是一条助手消息，底部工具栏会显示在 schema-card 下方',
                style: 'font-size: 14px; color: #666;'
              }
            }
          ]
        }),
      }
    ]
  }
];
</script>

