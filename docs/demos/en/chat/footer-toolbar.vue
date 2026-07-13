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
    content: 'Generate a button',
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
                text: 'Primary Button',
              },
            },
          ],
        }),
      },
    ],
  },
  {
    role: 'user',
    content: 'Search for train tickets',
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
                      props: { label: 'Departure', prop: 'departure' },
                      children: [
                        {
                          componentName: 'TinyInput',
                          props: { placeholder: 'Enter departure' },
                        },
                      ],
                    },
                    {
                      componentName: 'TinyFormItem',
                      props: { label: 'Destination', prop: 'destination' },
                      children: [
                        {
                          componentName: 'TinyInput',
                          props: { placeholder: 'Enter destination' },
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
                            text: 'Submit',
                            onClick: {
                              type: 'JSFunction',
                              value: "function() { this.callAction('continueChat', { message: 'Submit' }); }",
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
