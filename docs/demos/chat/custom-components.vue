<template>
  <GenuiChat :url="url" :customComponents="customComponents" :messages="messages" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import UserProfile from './components/user-profile.vue';

const url = 'https://your-chat-backend/api';

const customComponents = [
  {
    component: 'UserProfile',
    name: '用户资料',
    description: '显示用户基本信息和头像',
    schema: {
      properties: [
        {
          property: 'name',
          type: 'string',
          description: '用户名称',
          required: true,
        },
        {
          property: 'email',
          type: 'string',
          description: '用户邮箱',
        },
        {
          property: 'avatar',
          type: 'string',
          description: '头像URL',
        },
      ],
    },
    ref: UserProfile,
  },
];

// 默认消息，用于展示自定义组件
const messages = [
  {
    role: 'user',
    content: '展示用户资料',
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
              componentName: 'UserProfile',
              props: {
                name: 'John Doe',
                email: 'john@example.com'
              },
            },
          ],
        }),
      },
    ],
  },
];
</script>
