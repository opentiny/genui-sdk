<template>
  <SchemaRenderer :content="content" :generating="generating" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { SchemaRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({
  componentName: 'Page',
  children: [
    {
      componentName: 'TinyButton',
      props: {
        type: 'primary',
        text: '打开新页面',
        onClick: {
          type: 'JSFunction',
          value: "function() { this.callAction('openPage', { url: 'https://opentiny.design/', target: '_blank' }); }",
        },
      },
    },
  ],
});

const customActions = {
  openPage: {
    name: 'openPage',
    description: '打开新页面',
    execute: (params: any) => {
      const { url, target = '_self' } = params;
      window.open(url, target);
    },
    params: [
      {
        name: 'url',
        type: 'string',
        description: '要打开的页面地址',
      },
      {
        name: 'target',
        type: 'string',
        description: '打开方式，可选值：_self（当前窗口）、_blank（新窗口）',
      },
    ],
  },
};
</script>
