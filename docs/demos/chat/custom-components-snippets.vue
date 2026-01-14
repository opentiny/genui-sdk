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
  // 自定义组件
  customComponentsSchema: [
    {
      name: 'ProductCard',
      displayName: '商品卡片',
      description: '用于展示商品信息',
      props: [
        { name: 'name', type: 'string', description: '商品名称', required: true },
        { name: 'price', type: 'number', description: '商品价格', required: true },
        { name: 'image', type: 'string', description: '商品图片URL' }
      ],
      children: false
    }
  ],
  
  // 自定义片段
  customSnippets: [
    {
      name: '表单组合',
      description: '包含输入框和提交按钮的表单',
      schema: {
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
    }
  ]
};
</script>

