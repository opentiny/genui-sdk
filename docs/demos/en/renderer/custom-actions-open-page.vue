<template>
  <GenuiRenderer :content="content" :generating="generating" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({
  componentName: 'Page',
  children: [
    {
      componentName: 'TinyButton',
      props: {
        type: 'primary',
        text: 'Open New Page',
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
    description: 'Open a new page',
    execute: (params: any) => {
      const { url, target = '_self' } = params;
      window.open(url, target);
    },
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'The URL to open',
        },
        target: {
          type: 'string',
          description: 'Open method: _self (current window) or _blank (new window)',
        },
      },
      required: ['url', 'target'],
    },
  },
};
</script>
