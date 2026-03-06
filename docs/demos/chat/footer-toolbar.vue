<template>
  <GenuiChat :url="url" :roles="roles" :messages="messages" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import AssistantFooter from './components/assistant-footer.vue';
import UserFooter from './components/user-footer.vue';

const url = 'https://your-chat-backend/api';

const roles = {
  assistant: {
    slots: {
      trailer: AssistantFooter,
    },
  },
  user: {
    slots: {
      trailer: UserFooter,
    },
  },
};

const messages = [
  {
    role: 'user',
    content: '生成一个按钮',
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
              componentName: 'TinyButton',
              props: {
                type: 'primary',
                text: '主要按钮',
              },
            },
          ],
        }),
      },
    ],
  },
  {
    role: 'user',
    content: '查询火车票',
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
              componentName: 'TinyCard',
              children: [
                {
                  componentName: 'TinyForm',
                  props: {
                    labelPosition: 'top',
                    labelWidth: '120px',
                  },
                  children: [
                    {
                      componentName: 'TinyFormItem',
                      props: { label: '出发地', prop: 'departure' },
                      children: [
                        {
                          componentName: 'TinyInput',
                          props: { placeholder: '请输入出发地' },
                        },
                      ],
                    },
                    {
                      componentName: 'TinyFormItem',
                      props: { label: '目的地', prop: 'destination' },
                      children: [
                        {
                          componentName: 'TinyInput',
                          props: { placeholder: '请输入目的地' },
                        },
                      ],
                    },
                    {
                      componentName: 'TinyFormItem',
                      props: {},
                      children: [
                        {
                          componentName: 'TinyButton',
                          props: {
                            type: 'primary',
                            text: '提交',
                            onClick: {
                              type: 'JSFunction',
                              value: "function() { this.callAction('continueChat', { message: '提交' }); }",
                            },
                          },
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        }),
      },
    ],
  },
];
</script>
