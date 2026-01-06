<script setup lang="ts">
import TinySelect from '@opentiny/vue-select';
import { useAttrs, computed } from 'vue';

const attrs = useAttrs();
const selectAttrs = computed(() => {
  return {
    options: [],
    ...attrs,
  };
});
</script>

<template>
  <TinySelect v-bind="selectAttrs"></TinySelect>
</template>
