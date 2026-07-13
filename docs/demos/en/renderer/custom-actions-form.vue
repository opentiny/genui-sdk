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
            label: 'Name',
            prop: 'name',
          },
          children: [
            {
              componentName: 'TinyInput',
              props: {
                placeholder: 'Enter name',
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
            label: 'Age',
            prop: 'age',
          },
          children: [
            {
              componentName: 'TinyInput',
              props: {
                placeholder: 'Enter age',
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
                text: 'Show Form Content',
                onClick: {
                  type: 'JSFunction',
                  value: "function() { this.callAction('showNotification', { title: 'Form Content' }); }",
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
    description: 'Display a notification with the form content',
    execute: (params: any, context: Record<string, any>) => {
      const state = context.state;
      const message = JSON.stringify(state);

      alert(`${params.title}: ${message}`);
    },
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Notification title',
        },
      },
      required: ['title'],
    },
  },
};
</script>
