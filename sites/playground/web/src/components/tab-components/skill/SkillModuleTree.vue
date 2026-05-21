<script setup>
import { TinyTree } from '@opentiny/vue';

const props = defineProps({
  data: {
    type: Array,
    default: () => [],
  },
  currentNodeKey: {
    type: String,
    default: '',
  },
  modulePaths: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['select']);

const treeProps = {
  children: 'children',
  label: 'label',
};

const onCurrentChange = (data) => {
  if (!data?.id) return;
  if (!(data.id in props.modulePaths)) return;
  emit('select', data.id);
};
</script>

<template>
  <div class="skill-module-tree">
    <tiny-tree
      class="skill-module-tree-inner"
      :data="data"
      node-key="id"
      :props="treeProps"
      :current-node-key="currentNodeKey"
      highlight-current
      default-expand-all
      only-check-children
      :expand-on-click-node="false"
      @current-change="onCurrentChange"
    />
  </div>
</template>

<style scoped lang="less">
.skill-module-tree {
  width: 220px;
  max-height: 320px;
  overflow: auto;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
  padding: 4px 0;
  background: #fafafa;
}

.skill-module-tree-inner {
  background: transparent;
}
</style>
