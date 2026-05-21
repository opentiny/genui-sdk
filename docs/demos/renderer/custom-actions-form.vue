<template>
  <GenuiRenderer :content="content" :generating="generating" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({
  state: {
    formData: {
      name: '',
      age: '',
    },
  },
  componentName: 'Page',
  children: [
    {
      componentName: 'TinyForm',
      props: {
        model: {
          type: 'JSExpression',
          value: 'this.state.formData',
        },
        labelPosition: 'top',
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
                placeholder: '请输入姓名',
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
                placeholder: '请输入年龄',
                modelValue: {
                  type: 'JSExpression',
                  model: true,
                  value: 'this.state.formData.age',
                },
              },
            },
          ],
        },
        {
          componentName: 'TinyFormItem',
          props: {
            label: '',
          },
          children: [
            {
              componentName: 'TinyButton',
              props: {
                type: 'primary',
                text: '显示表单内容',
                onClick: {
                  type: 'JSFunction',
                  value: "function() { this.callAction('showNotification', { title: '表单内容' }); }",
                },
              },
            },
          ],
        },
      ],
    },
  ],
});

const customActions = {
  showNotification: {
    name: 'showNotification',
    description: '显示通知，弹出表单中实时绑定的内容',
    execute: (params: any, context: Record<string, any>) => {
      const state = context.state;
      const message = JSON.stringify(state);

      alert(`${params.title}：${message}`);
    },
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: '通知标题',
        },
      },
      required: ['title'],
    },
  },
};
</script>
