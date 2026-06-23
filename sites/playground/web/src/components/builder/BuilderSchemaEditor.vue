<script setup lang="ts">
import { computed } from 'vue';
import { CodeEditor } from 'monaco-editor-vue3';
import { TinyButton } from '@opentiny/vue';
import { iconClose } from '@opentiny/vue-icon';
import { useMonacoPlaygroundTheme, type PlaygroundColorTheme } from '../genui-template/use-monaco-playground-theme';

const props = defineProps({
  modelValue: {
    type: String,
    default: '{}',
  },
  theme: {
    type: String,
    default: 'light',
  },
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
  (event: 'close'): void;
}>();

const TinyCloseIcon = iconClose();
const monacoTheme = useMonacoPlaygroundTheme(() => props.theme as PlaygroundColorTheme);

const editorValue = computed({
  get() {
    return props.modelValue;
  },
  set(value: string) {
    emit('update:modelValue', value);
  },
});

const editorOptions = {
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
  folding: true,
  foldingHighlight: true,
  foldingStrategy: 'indentation',
  formatOnPaste: true,
  readOnly: true,
};
</script>

<template>
  <div class="builder-schema-editor">
    <div class="builder-schema-editor__header">
      <span class="builder-schema-editor__title">Schema</span>
      <tiny-button
        type="text"
        class="builder-schema-editor__close"
        :icon="TinyCloseIcon"
        aria-label="关闭"
        @click="emit('close')"
      />
    </div>
    <div class="builder-schema-editor__body">
      <code-editor
        v-model:value="editorValue"
        language="json"
        width="100%"
        height="100%"
        :theme="monacoTheme"
        :options="editorOptions"
      />
    </div>
  </div>
</template>

<style scoped lang="less">
.builder-schema-editor {
  flex: 1;
  width: 100%;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--tr-bubble-content-bg, #fff);

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 24px 0;
    flex-shrink: 0;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: var(--tr-text-primary, rgb(25, 25, 25));
  }

  &__close {
    &.tiny-button {
      min-width: 32px;
      width: 32px;
      height: 32px;
      padding: 0;
    }
  }

  &__body {
    flex: 1;
    min-height: 0;
    padding: 12px 24px 24px;
    display: flex;
    flex-direction: column;
    overflow: hidden;

    :deep(.monaco-code-editor) {
      flex: 1;
      min-height: 0;
      height: 100%;
    }
  }
}
</style>
