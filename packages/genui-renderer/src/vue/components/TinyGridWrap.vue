<script setup lang="ts">
import TinyGrid from '@opentiny/vue-grid';
import { useAttrs, computed } from 'vue';
const attrs = useAttrs();
const getColumns = (columns: Array<any>) => {
  const cols = columns?.filter((item: any) => item.type || item.field) || [];
  return cols.length > 0 ? cols : null;
};
const gridAttrs = computed(() => {
  return {
    ...attrs,
    columns: getColumns(attrs.columns as Array<any>),
  };
});
</script>

<template>
  <TinyGrid v-bind="gridAttrs"></TinyGrid>
</template>
