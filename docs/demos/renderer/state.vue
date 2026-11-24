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

// 从历史记录中恢复的状态（通过 setState 注入）
const historyState = {
  formData: {
    name: 'John Doe',
    age: 30,
  },
};

// 挂载完成后注入历史状态；若卡片仍在流式更新，schema 变化会重置状态，需在更新后重新调用
onMounted(() => {
  rendererRef.value?.setState(historyState);
});

const customActions = {
  getState: {
    execute: (params: any, context: Record<string, any>) => {
      const state = context.state;
      alert(`历史状态:\n${JSON.stringify(state, null, 2)}`);
    },
  },
};
</script>
