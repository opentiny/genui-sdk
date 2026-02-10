<script setup lang="ts">
import TinySelect from '@opentiny/vue-select';
import { useAttrs, computed } from 'vue';

const attrs = useAttrs();
const initProps = {
  options: [],
  tooltipConfig: { always: false },
};
const selectProps = computed(() => {
  Object.assign(initProps, attrs);
  return initProps;
});
</script>

<template>
  <TinySelect v-bind="selectProps"></TinySelect>
</template>
