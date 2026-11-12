<script setup lang="ts">
import { computed, type Component } from 'vue';
import * as SvgIcons from '@opentiny/vue-icon';

const props = withDefaults(
  defineProps<{
    name: string;
  }>(),
  {
    name: '',
  },
);

const iconComponent = computed(() => {
  const factory = (SvgIcons as Record<string, (() => Component) | unknown>)[props.name];
  return typeof factory === 'function' ? factory() : null;
});
</script>

<template>
  <component :is="iconComponent" v-if="iconComponent" />
</template>
