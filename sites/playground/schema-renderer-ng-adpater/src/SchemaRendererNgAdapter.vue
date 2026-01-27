<template>
  <tiny-schema-renderer-element-ng ref="rendererRef"></tiny-schema-renderer-element-ng>
</template>

<script setup lang="ts">
import { ref, toRaw, watch } from 'vue';
import '@opentiny/tiny-schema-renderer-ng/dist/renderer-element/browser/polyfills.js';
import '@opentiny/tiny-schema-renderer-ng/dist/renderer-element/browser/main.js';
const props = defineProps<{
  schema: any;
}>();
const rendererRef = ref<HTMLElement>();
let schema: any = null

watch([() => props.schema, () => rendererRef.value], ([newVal, newRendererRef]) => {
  schema = toRaw(newVal);
  if (rendererRef.value) {
    if (schema.children?.length) {
      setSchema();
    }
  }
}, { deep: true });


function setSchema() {
  (rendererRef.value as any).schema = schema;
  (rendererRef.value as any).detectChanges();
}
function setState(state: any) {
  return (rendererRef.value as any).setState(state)
}
function setContext(context: any) {
  return (rendererRef.value as any).setContext(context)
}
function getContext() {
  return (rendererRef.value as any).getContext()
}
defineExpose({
  setContext,
  getContext,
  setState
})

</script>
<style lang="less">
tiny-schema-renderer-element-ng {
  font-size:var(--ti-common-font-size-base);
  font-family:var(--ti-common-font-family);
  color:var(--ti-common-color-text-primary);
  background-color:var(--ti-common-color-bg-white-normal);
  // TODO: body上的css需要处理成:host伪类，上面是临时解决方案
  @import (less) '@opentiny/tiny-schema-renderer-ng/dist/renderer-element/browser/main.css';
}
</style>