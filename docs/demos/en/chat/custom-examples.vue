<template>
  <GenuiChat :url="url" :customExamples="customExamples" :messages="messages" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const userInfoCard = {
  componentName: 'TinyCard',
  props: {
    style:
      'background: linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%); padding: 24px; border-radius: 16px;',
  },
  children: [
    {
      componentName: 'div',
      props: {
        style: 'display: flex; align-items: center; margin-bottom: 20px;',
      },
      children: [
        {
          componentName: 'div',
          props: {
            style:
              'width: 80px; height: 80px; border-radius: 50%; background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: bold; color: #fff; margin-right: 16px; border: 3px solid rgba(255,255,255,0.5);',
          },
          children: 'J',
        },
        {
          componentName: 'div',
          props: {
            style: 'flex: 1;',
          },
          children: [
            {
              componentName: 'div',
              props: {
                style:
                  'font-size: 24px; font-weight: bold; color: #fff; margin-bottom: 8px; text-shadow: 0 2px 4px rgba(0,0,0,0.2);',
              },
              children: 'John Doe',
            },
            {
              componentName: 'div',
              props: {
                style: 'font-size: 14px; color: rgba(255,255,255,0.9); margin-bottom: 12px;',
              },
              children: 'john@example.com',
            },
            {
              componentName: 'div',
              props: {
                style: 'display: flex; gap: 8px; flex-wrap: wrap;',
              },
              children: [
                {
                  componentName: 'div',
                  props: {
                    style:
                      'background: rgba(255,255,255,0.25); color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);',
                  },
                  children: 'Frontend Dev',
                },
                {
                  componentName: 'div',
                  props: {
                    style:
                      'background: rgba(255,255,255,0.25); color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);',
                  },
                  children: 'Vue.js',
                },
                {
                  componentName: 'div',
                  props: {
                    style:
                      'background: rgba(255,255,255,0.25); color: #fff; padding: 4px 12px; border-radius: 12px; font-size: 12px; backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);',
                  },
                  children: '5 Years',
                },
              ],
            },
          ],
        },
      ],
    },
    {
      componentName: 'div',
      props: {
        style: 'border-top: 1px solid rgba(255,255,255,0.2); padding-top: 16px; margin-top: 16px;',
      },
      children: [
        {
          componentName: 'div',
          props: {
            style: 'display: flex; justify-content: space-around;',
          },
          children: [
            {
              componentName: 'div',
              props: {
                style: 'text-align: center;',
              },
              children: [
                {
                  componentName: 'div',
                  props: {
                    style: 'font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 4px;',
                  },
                  children: '128',
                },
                {
                  componentName: 'div',
                  props: {
                    style: 'font-size: 12px; color: rgba(255,255,255,0.8);',
                  },
                  children: 'Projects',
                },
              ],
            },
            {
              componentName: 'div',
              props: {
                style: 'text-align: center;',
              },
              children: [
                {
                  componentName: 'div',
                  props: {
                    style: 'font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 4px;',
                  },
                  children: '1.2K',
                },
                {
                  componentName: 'div',
                  props: {
                    style: 'font-size: 12px; color: rgba(255,255,255,0.8);',
                  },
                  children: 'Followers',
                },
              ],
            },
            {
              componentName: 'div',
              props: {
                style: 'text-align: center;',
              },
              children: [
                {
                  componentName: 'div',
                  props: {
                    style: 'font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 4px;',
                  },
                  children: '856',
                },
                {
                  componentName: 'div',
                  props: {
                    style: 'font-size: 12px; color: rgba(255,255,255,0.8);',
                  },
                  children: 'Likes',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

// Custom examples
const customExamples = [
  {
    name: 'Developer Info Card',
    description: 'Shows how to use TinyCard to create a stunning user info card with avatar, name, email, and tags',
    schema: userInfoCard,
  },
];

// Default messages to demonstrate custom Examples
const messages = [
  {
    role: 'user',
    content: 'Query John Doe info',
  },
  {
    role: 'assistant',
    content: '',
    messages: [
      {
        type: 'schema-card',
        content: JSON.stringify({
          componentName: 'Page',
          children: [userInfoCard],
        }),
      },
    ],
  },
];
</script>
