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
        componentName: 'TiFormField',
        props: {
          style: 'padding: 20px; max-width: 500px;',
        },
        children: [
          {
            componentName: 'TiItem',
            props: {
              label: '姓名',
              prop: 'name',
            },
            children: [
              {
                componentName: 'TiText',
                props: {
                  ngModel: {
                    type: 'JSExpression',
                    model: true,
                    value: 'this.state.formData.name',
                  },
                },
                directives: [
                  {
                    directiveName: 'ngModel',
                  },
                  {
                    directiveName: 'defaultValueAccessor',
                  },
                ],
              },
            ],
          },
          {
            componentName: 'TiItem',
            props: {
              label: '年龄',
              prop: 'age',
            },
            children: [
              {
                componentName: 'TiText',
                props: {
                  ngModel: {
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
        componentName: 'TiButton',
        props: {
          onClick: {
            type: 'JSFunction',
            value: "function() { this.callAction('getState'); }",
          },
        },
        children: [
          {
            componentName: 'Text',
            props: {
              text: '查看状态',
            },
          },
        ],
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
