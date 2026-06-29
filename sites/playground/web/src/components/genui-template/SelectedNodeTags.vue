<script setup lang="ts">
export interface SelectedNodeTag {
  id: string;
  componentName: string;
}

defineProps<{
  nodes: SelectedNodeTag[];
  removable?: boolean;
  inline?: boolean;
}>();

const emit = defineEmits<{
  (event: 'remove', id: string): void;
}>();
</script>

<template>
  <div v-if="nodes.length" :class="['selected-node-tags', { 'selected-node-tags--inline': inline }]">
    <span v-for="node in nodes" :key="node.id" class="selected-node-tag">
      <span class="selected-node-tag__name">{{ node.componentName }}</span>
      <button
        v-if="removable"
        type="button"
        class="selected-node-tag__close"
        @click.stop="emit('remove', node.id)"
      >
        ×
      </button>
    </span>
  </div>
</template>

<style scoped lang="less">
.selected-node-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  &--inline {
    display: contents;
  }
}

.selected-node-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(24, 144, 255, 0.08);
  border: 1px solid rgba(24, 144, 255, 0.25);
  box-sizing: border-box;

  &__name {
    font-size: 12px;
    line-height: 20px;
    color: #1890ff;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__close {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #666;
    font-size: 14px;
    line-height: 1;
    cursor: pointer;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
      color: #191919;
    }
  }
}
</style>
