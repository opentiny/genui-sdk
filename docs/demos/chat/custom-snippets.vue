<template>
  <GenuiChat
    :url="url"
    :customSnippets="customSnippets"
    :messages="messages"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

// 自定义片段
const customSnippets = [
  {
    componentName: 'TinyForm',
    props: {
      labelPosition: 'top',
      labelWidth: '120px'
    },
    children: [
      {
        componentName: 'TinyFormItem',
        props: {
          label: '姓名',
          prop: 'name',
          required: true
        },
        children: [
          {
            componentName: 'TinyInput',
            props: {
              placeholder: '请输入姓名'
            }
          }
        ]
      },
      {
        componentName: 'TinyFormItem',
        props: {
          label: '',
          prop: 'submit'
        },
        children: [
          {
            componentName: 'TinyButton',
            props: {
              type: 'primary',
              children: '提交'
            }
          }
        ]
      }
    ]
  }
];

// 默认消息，用于展示自定义片段
const messages = [
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
                text: '自定义片段示例 - 表单组合',
                style: 'font-size: 20px; font-weight: bold; margin-bottom: 16px;'
              }
            },
            {
              componentName: 'TinyForm',
              props: {
                labelPosition: 'top',
                labelWidth: '120px'
              },
              children: [
                {
                  componentName: 'TinyFormItem',
                  props: {
                    label: '姓名',
                    prop: 'name',
                    required: true
                  },
                  children: [
                    {
                      componentName: 'TinyInput',
                      props: {
                        placeholder: '请输入姓名'
                      }
                    }
                  ]
                },
                {
                  componentName: 'TinyFormItem',
                  props: {
                    label: '邮箱',
                    prop: 'email',
                    required: true
                  },
                  children: [
                    {
                      componentName: 'TinyInput',
                      props: {
                        placeholder: '请输入邮箱',
                        type: 'email'
                      }
                    }
                  ]
                },
                {
                  componentName: 'TinyFormItem',
                  props: {
                    label: '',
                    prop: 'submit'
                  },
                  children: [
                    {
                      componentName: 'TinyButton',
                      props: {
                        type: 'primary',
                        children: '提交'
                      }
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

