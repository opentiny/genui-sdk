<template>
  <GenuiChat :url="url" :customActions="customActions" :messages="messages" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customActions = [
  {
    name: 'openPage',
    description: 'Open a new page',
    execute: (params: any) => {
      window.open(params.url, params.target || '_self');
    },
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to open',
        },
        target: {
          type: 'string',
          description: 'Open method: _self (current window) or _blank (new window)',
        },
      },
      required: ['url', 'target'],
    },
  },
];
// Default messages to demonstrate custom Actions
const messages = [
  {
    role: 'user',
    content: 'Go to OpenTiny homepage',
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
                text: 'Click to Navigate',
                onClick: {
                  type: 'JSFunction',
                  value:
                    "function() { this.callAction('openPage', { url: 'https://opentiny.design/', target: '_blank' }); }",
                },
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
