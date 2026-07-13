<template>
  <GenuiRenderer :content="content" :generating="generating" :state="historyState" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);

// Schema restored from history
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
            label: 'Name',
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
            label: 'Age',
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
        text: 'View State',
        onClick: {
          type: 'JSFunction',
          value: "function() { this.callAction('getState'); }",
        },
      },
    },
  ],
});

// State restored from history (merged into global state on initialization)
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
      alert(`History State:\n${JSON.stringify(state, null, 2)}`);
    },
  },
};
</script>
