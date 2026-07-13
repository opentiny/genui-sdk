<template>
  <GenuiChat :url="url" :customComponents="customComponents" :messages="messages" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import UserProfile from '../../chat/components/user-profile.vue';

const url = 'https://your-chat-backend/api';

const customComponents = [
  {
    component: 'UserProfile',
    name: 'User Profile',
    description: 'Display user information with avatar',
    schema: {
      properties: [
        {
          property: 'name',
          type: 'string',
          description: 'User name',
          required: true,
        },
        {
          property: 'email',
          type: 'string',
          description: 'User email',
        },
        {
          property: 'avatar',
          type: 'string',
          description: 'Avatar URL',
        },
      ],
    },
    ref: UserProfile,
  },
];

// Default messages to demonstrate custom components
const messages = [
  {
    role: 'user',
    content: 'Show user profile',
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
