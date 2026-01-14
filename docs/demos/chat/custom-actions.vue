<template>
  <GenuiChat
    :url="url"
    :customConfig="customConfig"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customConfig = {
  customActions: [
    {
      name: 'continueChat',
      description: '继续对话，用于表单的提交按钮等',
      params: [
        {
          name: 'message',
          type: 'string',
          description: '对话消息'
        }
      ]
    },
    {
      name: 'openPage',
      description: '打开新页面',
      params: [
        {
          name: 'url',
          type: 'string',
          description: '目标页面URL'
        },
        {
          name: 'target',
          type: 'string',
          description: '打开方式'
        }
      ],
      execute: (params: any) => {
        window.open(params.url, params.target || '_self');
      }
    },
    {
      name: 'showNotification',
      description: '显示通知',
      params: [
        {
          name: 'message',
          type: 'string',
          description: '通知消息'
        },
        {
          name: 'type',
          type: 'string',
          description: '通知类型'
        }
      ],
      execute: (params: any) => {
        alert(`[${params.type || 'info'}] ${params.message}`);
      }
    }
  ]
};
</script>

