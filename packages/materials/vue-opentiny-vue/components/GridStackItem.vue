<script lang="ts" setup>
const props = defineProps({
  x: {
    type: Number,
    required: true,
    default: 0,
  },
  y: {
    type: Number,
    required: true,
    default: 0,
  },
  w: {
    type: Number,
    required: true,
  },
  h: {
    type: Number,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  autoPosition: {
    type: Boolean,
    default: true,
  },
});
</script>

<template>
  <div class="grid-stack-item" :key="id" :gs-x="x" :gs-y="y" :gs-w="w" :gs-h="h" :gs-id="id"
    :gs-auto-position="autoPosition">
    <div class="grid-stack-item-content">
      <slot></slot>
    </div>
  </div>
</template>