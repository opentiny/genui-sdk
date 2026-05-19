<script setup>
import { computed, ref, watch } from 'vue';
import SkillModuleTree from './SkillModuleTree.vue';
import SkillModuleFileEditor from './SkillModuleFileEditor.vue';
import { buildTreeDataFromModules, preferredSkillModulePath } from './index';

const emit = defineEmits(['modules-edit']);

const modules = defineModel('modules', { type: Object, required: true });

const selectedPath = ref('');

const treeData = computed(() => buildTreeDataFromModules(modules.value || {}));

const editorContent = computed({
  get() {
    const p = selectedPath.value;
    if (!p || !modules.value) return '';
    return modules.value[p] ?? '';
  },
  set(v) {
    const p = selectedPath.value;
    if (!p || !modules.value) return;
    modules.value = { ...modules.value, [p]: v };
    emit('modules-edit');
  },
});

watch(
  () => modules.value,
  (m) => {
    if (!m || typeof m !== 'object') {
      selectedPath.value = '';
      return;
    }
    if (selectedPath.value && selectedPath.value in m) return;
    selectedPath.value = preferredSkillModulePath(m) || '';
  },
  { immediate: true, deep: true },
);

const onSelectFile = (path) => {
  selectedPath.value = path;
};
</script>

<template>
  <div class="skill-modules-explorer">
    <SkillModuleTree
      :data="treeData"
      :current-node-key="selectedPath"
      :module-paths="modules"
      @select="onSelectFile"
    />
    <SkillModuleFileEditor v-model="editorContent" :file-path="selectedPath" />
  </div>
</template>

<style scoped lang="less">
.skill-modules-explorer {
  display: flex;
  gap: 12px;
  align-items: stretch;
  margin-top: 8px;
  min-height: 280px;
}
</style>
