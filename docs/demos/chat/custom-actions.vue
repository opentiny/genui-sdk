<template>
  <GenuiChat
    :url="url"
    :customActions="customActions"
    :messages="messages"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customActions = [
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
        description: '打开方式，可选值：_self（当前窗口）、_blank（新窗口）'
      }
    ],
    execute: (params: any) => {
      window.open(params.url, params.target || '_self');
    }
  }
];

// 默认消息，用于展示自定义 Actions
const messages = [
  {
    role: 'user',
    content: '跳转opentiny首页'
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
                text: '点击跳转',
                onClick: {
                  type: 'JSFunction',
                  value: "function() { this.callAction('openPage', { url: 'https://opentiny.design/', target: '_blank' }); }"
                }
              }
            }
          ]
        }),
      }
    ]
  },
  {
    role: 'user',
    content: '查询火车票'
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
                    }
                  ]
                },
                {
                  componentName: 'TinyFormItem',
                  props: { label: '目的地', prop: 'destination' },
                  children: [
                    {
                      componentName: 'TinyInput',
                      props: { placeholder: '请输入目的地' },
                    }
                  ]
                },
                { 
                  componentName: 'TinyFormItem',
                  props: { },
                  children: [
                    {
                      componentName: 'TinyButton',
                      props: { type: 'primary', text: '提交', onClick: { type: 'JSFunction', value: "function() { this.callAction('continueChat', { message: '提交' }); }" } },
                    }
                  ]
                }
              ]
            }
          ]
        }),
      }
    ]
  }
];
</script>

