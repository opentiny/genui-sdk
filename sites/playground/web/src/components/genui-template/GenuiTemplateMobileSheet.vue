<script setup lang="ts">
import { CodeEditor } from 'monaco-editor-vue3';
import { GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { TinyButton } from '@opentiny/vue';
import type { CSSProperties } from 'vue';

const props = defineProps<{
  visible: boolean;
  jsonEditorOpen: boolean;
  panelStyle: CSSProperties;
  showReturnLatestButton: boolean;
  currentPreviewSchema: Record<string, unknown> | null;
  schemaEditor: string;
  editorOptions: Record<string, unknown>;
  viewSchemaIcon: string;
  closeIcon: unknown;
}>();

const emit = defineEmits<{
  (event: 'update:jsonEditorOpen', value: boolean): void;
  (event: 'update:schemaEditor', value: string): void;
  (event: 'mask-click'): void;
  (event: 'grab-touch-start', value: TouchEvent): void;
  (event: 'close'): void;
  (event: 'apply-current-version'): void;
  (event: 'reset-to-latest-version'): void;
}>();

const handleJsonEditorChange = (value: string) => {
  emit('update:schemaEditor', value);
};
</script>

<template>
  <Teleport to="body">
    <Transition name="schema-mobile-sheet">
      <div
        v-show="visible"
        class="schema-mobile-sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="jsonEditorOpen ? 'Schema JSON 编辑器' : 'Schema JSON 预览'"
      >
        <div class="schema-mobile-sheet__mask" @click="emit('mask-click')" />
        <div class="schema-mobile-sheet__panel" :style="props.panelStyle">
          <div class="schema-mobile-sheet__grab" @touchstart="emit('grab-touch-start', $event)" />
          <div class="schema-mobile-sheet__header">
            <div class="schema-mobile-sheet__header-start">
              <button
                v-if="!jsonEditorOpen"
                type="button"
                class="schema-mobile-sheet__entry"
                @click="emit('update:jsonEditorOpen', true)"
              >
                <img class="schema-mobile-sheet__entry-icon" :src="viewSchemaIcon" alt="" />
                查看 JSON
              </button>
              <button
                v-else
                type="button"
                class="schema-mobile-sheet__back"
                @click="emit('update:jsonEditorOpen', false)"
              >
                返回预览
              </button>
            </div>
            <div class="schema-mobile-sheet__header-end">
              <tiny-button
                type="text"
                class="genui-schema-toolbar-close-btn"
                :icon="closeIcon"
                aria-label="关闭"
                @click="emit('close')"
              />
            </div>
          </div>
          <div
            :class="['schema-mobile-sheet__body', { 'schema-mobile-sheet__body--with-footer': showReturnLatestButton }]"
          >
            <div
              v-if="currentPreviewSchema"
              v-show="!jsonEditorOpen"
              class="schema-mobile-sheet__preview schema-mobile-sheet__preview--solo"
            >
              <schema-renderer
                class="schema-mobile-sheet-renderer"
                :content="currentPreviewSchema"
                :generating="false"
              />
            </div>
            <Transition name="schema-mobile-json">
              <div v-show="jsonEditorOpen" class="schema-mobile-sheet__editor schema-mobile-sheet__editor--layer">
                <code-editor
                  :value="schemaEditor"
                  language="json"
                  theme="vs"
                  :options="editorOptions"
                  @update:value="handleJsonEditorChange"
                />
              </div>
            </Transition>
          </div>
          <div v-if="showReturnLatestButton" class="schema-mobile-sheet__footer">
            <tiny-button round class="schema-mobile-sheet__latest-btn" @click="emit('apply-current-version')">
              应用此版本
            </tiny-button>
            <tiny-button
              type="primary"
              round
              class="schema-mobile-sheet__latest-btn"
              @click="emit('reset-to-latest-version')"
            >
              返回最新版本
            </tiny-button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="less">
.genui-schema-toolbar-close-btn {
  flex-shrink: 0;

  &.tiny-button {
    box-sizing: border-box;
    min-width: 32px;
    width: 32px;
    height: 32px;
    padding: 0;
    color: #666;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;

    &:hover {
      color: #191919;
      background: rgba(0, 0, 0, 0.06);
    }

    &:active {
      background: rgba(0, 0, 0, 0.08);
    }
  }
}

.schema-mobile-sheet {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: auto;

  &__mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
  }

  &__panel {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 48vh;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    background: #fff;
    border-radius: 16px 16px 0 0;
    box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.12);
    overflow: hidden;
    transform: translateY(0);
  }

  &__grab {
    flex-shrink: 0;
    width: 36px;
    height: 4px;
    margin: 10px auto 6px;
    position: relative;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.12);
    touch-action: none;

    &::before {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 96px;
      height: 32px;
      transform: translate(-50%, -50%);
    }
  }

  &__header {
    flex-shrink: 0;
    flex-grow: 0;
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    max-height: 64px;
    padding: 8px 12px;
    border-bottom: 1px solid rgb(232, 232, 232);
    box-sizing: border-box;
    overflow: hidden;
  }

  &__header-start {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  &__header-end {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }

  &__latest-btn {
    flex-shrink: 1;
    min-width: 0;
    max-width: 50%;
  }

  &__footer {
    z-index: 3;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    background: #fff;

    .schema-mobile-sheet__latest-btn {
      max-width: none;
    }
  }

  &__entry {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    max-width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    font: inherit;
    text-align: inherit;
    color: #191919;
    font-size: 14px;
    line-height: 22px;
    cursor: pointer;
    user-select: none;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    &:focus-visible {
      outline: 2px solid #1890ff;
      outline-offset: 2px;
      border-radius: 4px;
    }
  }

  &__entry-icon {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }

  &__back {
    margin: 0;
    padding: 6px 4px;
    border: none;
    background: transparent;
    font-size: 14px;
    line-height: 22px;
    color: #1890ff;
    cursor: pointer;
    white-space: nowrap;
  }

  &__body {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-sizing: border-box;
  }

  &__preview {
    &--solo {
      flex: 1;
      min-height: 0;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
      background: #fafafa;
    }
  }

  &__editor {
    &--layer {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: flex;
      flex-direction: column;
      min-height: 0;
      background: #fff;
      box-sizing: border-box;
    }
  }

  &-renderer {
    min-height: 120px;
    padding: 12px;
    box-sizing: border-box;
  }

  &__editor--layer :deep(.monaco-code-editor) {
    flex: 1;
    min-height: 0;
  }
}

.schema-mobile-json-enter-active,
.schema-mobile-json-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}

.schema-mobile-json-enter-from,
.schema-mobile-json-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.schema-mobile-sheet-enter-active,
.schema-mobile-sheet-leave-active {
  transition: opacity 0.22s ease;

  .schema-mobile-sheet__panel {
    transition: transform 0.28s cubic-bezier(0.32, 0.72, 0, 1);
  }
}

.schema-mobile-sheet-enter-from,
.schema-mobile-sheet-leave-to {
  opacity: 0;

  .schema-mobile-sheet__panel {
    transform: translateY(100%);
  }
}
</style>
