<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiRenderer
      :content="content"
      :generating="generating"
      :requiredCompleteFieldSelectors="selectors"
    />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { ref } from 'vue';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({
  componentName: 'Page',
  children: [
    {
      componentName: 'TinySelect',
      props: {
        items: [
          { label: '选项1', value: '1' },
          { label: '选项2', value: '2' },
          { label: '选项3', value: '3' },
        ],
      },
    },
  ],
});

// 指定需要完整的字段路径
const selectors = ['props.items', 'children[0].props'];
</script>
