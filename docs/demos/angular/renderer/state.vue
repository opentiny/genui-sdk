<template>
  <GenuiRenderer :content="content" :generating="generating" :state="historyState" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import GenuiRenderer from './adapter.vue';

const generating = ref(false);

// 从历史记录中恢复的 Schema
const content = ref({
  componentName: 'Page',
  state: {
    formData: {
      name: '',
      age: null,
    },
  },
  children: [
    {
      componentName: 'div',
      props: {
        style: 'padding: 20px; max-width: 500px;',
      },
      children: [
        {
          componentName: 'div',
          props: {
            style: 'display: flex; flex-direction: column; gap: 8px;'
          },
          children: [
            {
              componentName: 'label',
              props: {
                style: 'font-weight: bold;'
              },
              children: '姓名'
            },
            {
              componentName: 'TiText',
              props: {
                placeholder: '请输入姓名',
                ngModel: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.name'
                }
              },
            },
          ]
        },
        {
          componentName: 'div',
          props: {
            style: 'display: flex; flex-direction: column; gap: 8px;'
          },
          children: [
            {
              componentName: 'label',
              props: {
                style: 'font-weight: bold;'
              },
              children: '年龄'
            },
            {
              componentName: 'TiText',
              props: {
                placeholder: '请输入年龄',
                ngModel: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.age'
                }
              }
            }
          ]
        }
      ]
    },
    {
      componentName: 'TiButton',
      props: {
        onClick: {
          type: 'JSFunction',
          value: 'function() { this.callAction(\'getState\'); }',
        },
      },
      children: '查看状态'
    }
  ]
});

// 从历史记录中恢复的状态（初始化时合并到全局状态）
const historyState = {
  formData: {
    name: 'John Doe',
    age: 30,
  },
};

const customActions = {
  getState: {
    execute: (params: any, context: Record<string, any>) => {
      const state = context.state;
      alert(`历史状态:\n${JSON.stringify(state, null, 2)}`);
    },
  },
};
</script>
