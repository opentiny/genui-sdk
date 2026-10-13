<script setup>
import { TinyInput } from '@opentiny/vue';
import { t } from '../../../i18n';

const props = defineProps({
  filePath: {
    type: String,
    default: '',
  },
  modelValue: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['update:modelValue']);

const onInput = (val) => {
  emit('update:modelValue', typeof val === 'string' ? val : '');
};
</script>

<template>
  <div class="skill-module-file-editor">
    <div v-if="filePath" class="skill-module-file-editor-path">{{ filePath }}</div>
    <div v-else class="skill-module-file-editor-empty">{{ t('skill.selectFileHint') }}</div>
    <tiny-input
      v-if="filePath"
      class="skill-module-file-editor-input"
      type="textarea"
      :model-value="modelValue"
      :autosize="{ minRows: 14, maxRows: 22 }"
      :placeholder="t('skill.fileContent')"
      @update:model-value="onInput"
    />
  </div>
</template>

<style scoped lang="less">
.skill-module-file-editor {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skill-module-file-editor-path {
  font-size: 12px;
  color: #595959;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  word-break: break-all;
  line-height: 1.4;
}

.skill-module-file-editor-empty {
  font-size: 13px;
  color: #8c8c8c;
  padding: 24px 8px;
  text-align: center;
}

.skill-module-file-editor-input {
  flex: 1;
}

:deep(.skill-module-file-editor-input textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.5;
}
</style>
