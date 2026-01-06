<script setup lang="ts">
import { onMounted, ref, onUpdated } from 'vue';
import { GridStack, type GridStackElement } from 'gridstack';

const grid = ref<GridStack | null>(null);
const gridStackRef = ref<HTMLDivElement | null>(null);
onUpdated(() => {
  const compEls = gridStackRef.value?.querySelectorAll('.grid-stack-item');
  compEls?.forEach((el) => {
    grid.value?.makeWidget(el as GridStackElement)
  });
})

onMounted(() => {
  grid.value = GridStack.init({
    float: true,
    cellHeight: '100px',
    disableDrag: true,
    disableResize: true,
    minRow: 1,
    marginLeft: 2
  }, gridStackRef.value as GridStackElement);
})
</script>

<template>
  <div class="grid-stack" ref="gridStackRef">
    <slot> </slot>
  </div>
</template>
