<template>
  <SchemaRenderer :content="content" :generating="generating" :state="historyState" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SchemaRenderer } from '@opentiny/genui-sdk-vue';

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
      componentName: 'TinyForm',
      props: {
        model: {
          type: 'JSExpression',
          value: 'this.state.formData',
        },
        'label-position': 'top',
      },
      children: [
        {
          componentName: 'TinyFormItem',
          props: {
            label: '姓名',
            prop: 'name',
          },
          children: [
            {
              componentName: 'TinyInput',
              props: {
                modelValue: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.name',
                },
              },
            },
          ],
        },
        {
          componentName: 'TinyFormItem',
          props: {
            label: '年龄',
            prop: 'age',
          },
          children: [
            {
              componentName: 'TinyInput',
              props: {
                modelValue: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.age',
                },
              },
            },
          ],
        },
      ],
    },
    {
      componentName: 'TinyButton',
      props: {
        text: '查看状态',
        onClick: {
          type: 'JSFunction',
          value: "function() { this.callAction('getState'); }",
        },
      },
    },
  ],
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
