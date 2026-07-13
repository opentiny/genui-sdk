<template>
  <GenuiRenderer :content="content" :generating="generating" :state="historyState" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import GenuiRenderer from '../../../angular/renderer/adapter.vue';

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
              children: 'Name'
            },
            {
              componentName: 'TiText',
              props: {
                placeholder: 'Enter name',
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
              children: 'Age'
            },
            {
              componentName: 'TiText',
              props: {
                placeholder: 'Enter age',
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
      children: 'View State'
    }
  ]
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
