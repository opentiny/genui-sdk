<script setup lang="ts">
import { computed } from 'vue';
import inspectModeSvg from '../../assets/images/inspect-mode.svg?raw';

const svgMarkup = computed(() =>
  inspectModeSvg.replace(/<svg([^>]*)>/, '<svg$1 class="inspect-mode-icon__svg">'),
);
</script>

<template>
  <span class="inspect-mode-icon" v-html="svgMarkup" aria-hidden="true" />
</template>

<style scoped lang="less">
.inspect-mode-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  line-height: 0;

  :deep(.inspect-mode-icon__svg) {
    width: 18px;
    height: 18px;
    display: block;
  }
}
</style>
