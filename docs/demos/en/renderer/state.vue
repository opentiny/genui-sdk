<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiRenderer
      ref="rendererRef"
      :content="content"
      :generating="generating"
      :customActions="customActions"
    />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { onMounted, ref } from 'vue';
import { GenuiConfigProvider, GenuiRenderer, type IRendererExpose } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const rendererRef = ref<IRendererExpose | null>(null);

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

// State restored from history (injected via setState)
const historyState = {
  formData: {
    name: 'John Doe',
    age: 30,
  },
};

// Inject the restored state after mount; a streamed schema update resets it, so re-call after updates
onMounted(() => {
  rendererRef.value?.setState(historyState);
});

const customActions = {
  getState: {
    execute: (params: any, context: Record<string, any>) => {
      const state = context.state;
      alert(`History State:\n${JSON.stringify(state, null, 2)}`);
    },
  },
};
</script>
