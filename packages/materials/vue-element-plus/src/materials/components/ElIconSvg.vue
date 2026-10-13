<script setup lang="ts">
import { computed, type Component } from 'vue';
import * as Icons from '@element-plus/icons-vue';

const props = withDefaults(
  defineProps<{
    name: string;
  }>(),
  {
    name: '',
  },
);

const iconComponent = computed(() => {
  const cmp = (Icons as Record<string, Component | unknown>)[props.name];
  return cmp || null;
});
</script>

<template>
  <component :is="iconComponent" v-if="iconComponent" />
</template>
