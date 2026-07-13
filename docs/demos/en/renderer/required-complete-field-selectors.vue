<template>
  <GenuiRenderer
    :content="content"
    :generating="generating"
    :requiredCompleteFieldSelectors="selectors"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({
  componentName: 'Page',
  children: [
    {
      componentName: 'TinySelect',
      props: {
        items: [
          { label: 'Option 1', value: '1' },
          { label: 'Option 2', value: '2' },
          { label: 'Option 3', value: '3' },
        ],
      },
    },
  ],
});

// Specify field paths that need to be complete
const selectors = ['props.items', 'children[0].props'];
</script>
