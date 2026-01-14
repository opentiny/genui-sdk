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
  // 自定义组件定义
  customComponentsSchema: [
    {
      name: 'ProductCard',
      displayName: '商品卡片',
      description: '用于展示商品信息的卡片组件',
      props: [
        {
          name: 'name',
          type: 'string',
          description: '商品名称',
          required: true
        },
        {
          name: 'price',
          type: 'number',
          description: '商品价格',
          required: true
        },
        {
          name: 'image',
          type: 'string',
          description: '商品图片URL'
        },
        {
          name: 'onClick',
          type: 'function',
          description: '点击事件处理函数'
        }
      ],
      children: false
    }
  ],
  
  // 自定义示例
  customExamples: [
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
  ]
};
</script>

