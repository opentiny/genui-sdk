<template>
  <GenuiChat
    :url="url"
    :customExamples="customExamples"
    :messages="messages"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

// 自定义示例
const customExamples = [
  {
    name: 'ProductCard 基础用法',
    description: '展示 ProductCard 组件的基本使用方法',
    schema: {
      componentName: 'ProductCard',
      props: {
        name: 'iPhone 15',
        price: 5999,
        image: 'https://example.com/iphone15.jpg'
      }
    }
  },
  {
    name: 'ProductCard 带点击事件',
    description: '展示如何为 ProductCard 添加点击事件处理',
    schema: {
      componentName: 'ProductCard',
      props: {
        name: 'iPhone 15',
        price: 5999,
        image: 'https://example.com/iphone15.jpg',
        onClick: {
          type: 'JSFunction',
          value: "function() { this.callAction('openPage', { url: '/product/iphone15' }); }"
        }
      }
    }
  },
  {
    name: '商品列表组合',
    description: '展示如何使用 ProductCard 创建商品列表',
    schema: {
      componentName: 'Page',
      children: [
        {
          componentName: 'Text',
          props: {
            text: '热门商品',
            style: 'font-size: 24px; font-weight: bold; margin: 16px 0;'
          }
        },
        {
          componentName: 'GridStack',
          props: {
            columns: 3,
            gap: 16
          },
          children: [
            {
              componentName: 'GridStackItem',
              children: [
                {
                  componentName: 'ProductCard',
                  props: {
                    name: '商品1',
                    price: 99,
                    image: 'https://example.com/product1.jpg'
                  }
                }
              ]
            },
            {
              componentName: 'GridStackItem',
              children: [
                {
                  componentName: 'ProductCard',
                  props: {
                    name: '商品2',
                    price: 199,
                    image: 'https://example.com/product2.jpg'
                  }
                }
              ]
            },
            {
              componentName: 'GridStackItem',
              children: [
                {
                  componentName: 'ProductCard',
                  props: {
                    name: '商品3',
                    price: 299,
                    image: 'https://example.com/product3.jpg'
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  }
];

// 默认消息，用于展示自定义 Examples
const messages = [
  {
    role: 'user',
    content: '展示商品卡片示例'
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
              componentName: 'Text',
              props: {
                text: '自定义 Examples 示例',
                style: 'font-size: 20px; font-weight: bold; margin-bottom: 16px;'
              }
            },
            {
              componentName: 'Text',
              props: {
                text: '这些示例会帮助 LLM 学习如何正确使用组件',
                style: 'color: #666; margin-bottom: 24px;'
              }
            }
          ]
        }),
      }
    ]
  }
];
</script>

