<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import type { SelectedSchemaNode } from './schema-node-selection';
import {
  getComposerContent,
  insertTagAtCursor,
  removeComposerTag,
  removeTagBeforeCursor,
  saveSelection,
  type ComposerContent,
} from './schema-composer';
import { useSchemaDevModeOptional } from './useSchemaDevMode';

const props = withDefaults(
  defineProps<{
    placeholder?: string;
    loading?: boolean;
    maxLength?: number;
  }>(),
  {
    placeholder: '',
    loading: false,
    maxLength: 5000,
  },
);

const emit = defineEmits<{
  submit: [];
  cancel: [];
}>();

const schemaDevMode = useSchemaDevModeOptional();
const editorRef = ref<HTMLDivElement>();
const savedRange = ref<Range | null>(null);
const isEmpty = ref(true);
const textLength = ref(0);

const canSubmit = computed(() => !isEmpty.value && textLength.value <= props.maxLength);

const syncState = () => {
  if (!editorRef.value) {
    return;
  }
  const content = getComposerContent(editorRef.value);
  isEmpty.value = content.isEmpty;
  textLength.value = content.textLength;
};

const focusEditor = () => {
  editorRef.value?.focus();
};

const insertTag = (node: SelectedSchemaNode) => {
  if (!editorRef.value) {
    return;
  }
  insertTagAtCursor(editorRef.value, node, savedRange.value);
  nextTick(syncState);
};

const getContent = (): ComposerContent => {
  return getComposerContent(editorRef.value!);
};

const clear = () => {
  if (editorRef.value) {
    editorRef.value.innerHTML = '';
  }
  isEmpty.value = true;
  textLength.value = 0;
  savedRange.value = null;
};

const onInput = () => {
  if (!editorRef.value) {
    return;
  }
  const content = getComposerContent(editorRef.value);
  if (content.textLength > props.maxLength) {
    // 超出字数时回退一次输入
    document.execCommand('undo');
  }
  syncState();
};

const onBlur = () => {
  if (editorRef.value) {
    savedRange.value = saveSelection(editorRef.value);
  }
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    if (!props.loading && canSubmit.value) {
      emit('submit');
    }
    return;
  }
  if (event.key === 'Backspace' && editorRef.value) {
    if (removeTagBeforeCursor(editorRef.value)) {
      event.preventDefault();
      nextTick(syncState);
    }
  }
};

const onEditorClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  const removeBtn = target.closest('.composer-tag__remove');
  if (removeBtn) {
    event.preventDefault();
    const tagEl = removeBtn.closest('.composer-tag') as HTMLElement | null;
    if (tagEl) {
      removeComposerTag(tagEl);
      syncState();
      focusEditor();
    }
  }
};

onMounted(() => {
  schemaDevMode?.registerComposer({
    insertTag,
    getContent,
    clear,
    focus: focusEditor,
  });
  syncState();
});

onUnmounted(() => {
  schemaDevMode?.registerComposer(null);
});
</script>

<template>
  <div class="template-inline-sender">
    <div class="template-inline-sender__box" @click="focusEditor">
      <div
        ref="editorRef"
        class="template-inline-sender__editor"
        :class="{ 'is-empty': isEmpty }"
        :data-placeholder="placeholder"
        contenteditable="true"
        @input="onInput"
        @blur="onBlur"
        @keydown="onKeydown"
        @click="onEditorClick"
      />
    </div>
    <div class="template-inline-sender__footer">
      <span class="template-inline-sender__count">{{ textLength }} / {{ maxLength }}</span>
      <button
        v-if="loading"
        type="button"
        class="template-inline-sender__btn template-inline-sender__btn--stop"
        @click="emit('cancel')"
      >
        ■
      </button>
      <button
        v-else
        type="button"
        class="template-inline-sender__btn template-inline-sender__btn--send"
        :disabled="!canSubmit"
        @click="emit('submit')"
      >
        ↑
      </button>
    </div>
  </div>
</template>

<style scoped lang="less">
.template-inline-sender {
  width: 80%;
  margin: 0 auto;
  border: 1px solid var(--tr-sender-border-color, #e5e5e5);
  border-radius: 16px;
  background: var(--tr-sender-bg-color, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  box-sizing: border-box;

  &__box {
    padding: 10px 14px 4px;
    cursor: text;
  }

  &__editor {
    min-height: 28px;
    max-height: 160px;
    overflow-y: auto;
    outline: none;
    color: var(--tr-sender-text-color, #191919);
    font-size: 14px;
    line-height: 28px;
    word-break: break-word;
    white-space: pre-wrap;

    &.is-empty::before {
      content: attr(data-placeholder);
      color: #999;
      pointer-events: none;
    }

    :deep(.composer-tag) {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      max-width: calc(100% - 8px);
      margin: 0 2px;
      padding: 0 6px;
      vertical-align: baseline;
      border-radius: 6px;
      background: rgba(24, 144, 255, 0.08);
      border: 1px solid rgba(24, 144, 255, 0.25);
      box-sizing: border-box;
      user-select: none;
    }

    :deep(.composer-tag__name) {
      font-size: 12px;
      line-height: 22px;
      color: #1890ff;
      white-space: nowrap;
    }

    :deep(.composer-tag__remove) {
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

  &__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    padding: 4px 10px 10px;
  }

  &__count {
    font-size: 12px;
    color: #999;
    line-height: 20px;
  }

  &__btn {
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;

    &--send {
      color: #fff;
      background: var(--tr-sender-action-buttons-send-bg-color, #191919);

      &:disabled {
        opacity: 0.35;
        cursor: not-allowed;
      }
    }

    &--stop {
      color: #fff;
      background: #ff4d4f;
      font-size: 12px;
    }
  }
}
</style>
