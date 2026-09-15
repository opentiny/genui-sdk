<script setup lang="ts">
import { computed } from 'vue';
import { GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { TinyButton } from '@opentiny/vue';
import { iconClose } from '@opentiny/vue-icon';
import GenuiTemplateChat from './GenuiTemplateChat.vue';
import SchemaVersionHistoryPanel from './SchemaVersionHistoryPanel.vue';
import SchemaJsonEditor from './SchemaJsonEditor.vue';
import SchemaPreviewToolbar from './SchemaPreviewToolbar.vue';
import { useTemplateContext } from './composables';
import { isRenderableSchema } from './template-chat-utils';
import { useSchemaDevMode } from './useSchemaDevMode';
import { useSchemaRendererInspect } from './useSchemaRendererInspect';
import { t } from '../../i18n';

defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const TinyCloseIcon = iconClose();
const { schema, conversation, versionControl, editor, ui, actions } = useTemplateContext();
const { isDevMode, insertComposerTag } = useSchemaDevMode();

const rendererSchema = computed(() => {
  const preview = schema.currentPreviewSchema ?? schema.currentSchema;
  return isRenderableSchema(preview) ? preview : null;
});

const rendererSchemaKey = computed(() => {
  const preview = rendererSchema.value as Record<string, unknown> | null;
  const componentName = preview?.componentName ?? 'schema';
  return `${schema.currentCardId || 'preview'}-${String(componentName)}`;
});

const {
  containerRef: rendererContainerRef,
  highlight: inspectHighlight,
  onMouseMove: handleRendererMouseMove,
  onMouseLeave: handleRendererMouseLeave,
  onClick: handleRendererInspectClick,
} = useSchemaRendererInspect({
  isDevMode,
  schema: rendererSchema,
  insertComposerTag,
});
</script>

<template>
  <div class="genui-schema-template">
    <div class="genui-schema-template-item chat-container">
      <genui-template-chat
        v-if="conversation.isTemplateInit"
        v-show="!ui.schemaEditorVisible"
        class="genui-template-chat"
      />
      <div class="schema-version-container" v-show="ui.schemaEditorVisible">
        <div class="schema-version-container__header">
          <span class="schema-version-container__title">
            {{ versionControl.schemaEditorShowDiffView ? t('templateEditor.schemaDiffTitle') : t('templateEditor.schemaJsonTitle') }}
          </span>
          <div class="schema-version-container__header-actions">
            <tiny-button
              v-if="actions.schemaEditorDirty && !versionControl.isEditorReadOnly"
              type="primary"
              size="small"
              round
              :loading="editor.schemaEditorSaveLoading"
              @click="actions.handleSaveSchemaEditor"
            >
              {{ t('templateEditor.save') }}
            </tiny-button>
            <tiny-button
              type="text"
              class="genui-schema-toolbar-close-btn"
              :icon="TinyCloseIcon"
              :aria-label="t('templateEditor.close')"
              @click="actions.closeSchemaEditorView"
            />
          </div>
        </div>
        <schema-json-editor :theme="theme" layout="panel" />
      </div>
    </div>
    <div class="genui-schema-template-item renderer-container" v-if="rendererSchema && ui.rendererPanelVisible">
      <div class="renderer-container-wrapper">
        <schema-preview-toolbar variant="desktop" />
        <div class="schema-renderer-body">
          <div
            ref="rendererContainerRef"
            :class="['schema-renderer', { 'is-inspectable': isDevMode }]"
            @mousemove="handleRendererMouseMove"
            @mouseleave="handleRendererMouseLeave"
            @click.capture="handleRendererInspectClick"
          >
            <schema-renderer
              :key="rendererSchemaKey"
              :content="rendererSchema"
              :generating="false"
              :is-json-complete="schema.currentPreviewSchemaComplete"
            />
          </div>
          <div v-if="inspectHighlight" class="schema-inspect-overlay" aria-hidden="true">
            <div
              class="schema-inspect-highlight"
              :class="{ 'is-label-inside': inspectHighlight.labelInside }"
              :style="{
                top: `${inspectHighlight.top}px`,
                left: `${inspectHighlight.left}px`,
                width: `${inspectHighlight.width}px`,
                height: `${inspectHighlight.height}px`,
              }"
            >
              <span class="schema-inspect-label">{{ inspectHighlight.label }}</span>
            </div>
          </div>
          <schema-version-history-panel :theme="theme" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@schema-toolbar-height: 64px;

.genui-schema-template {
  display: flex;
  margin-bottom: 20px;
  width: 100%;
  min-height: 0;
  height: 100%;
  overflow: hidden;

  &-item {
    flex: 1;
    min-height: 0;
  }

  .chat-container {
    display: flex;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  .renderer-container {
    overflow: auto;
    min-height: 0;
    box-sizing: border-box;

    &-wrapper {
      background-color: #ffffff;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      position: relative;
      border-left: 1px solid rgb(232, 232, 232);
    }

    .schema-renderer-body {
      flex: 1;
      min-height: 0;
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .schema-renderer {
      flex: 1;
      min-height: 0;
      padding: 20px;
      overflow: auto;
      box-sizing: border-box;

      &.is-inspectable {
        cursor: default;

        :deep([data-id]) {
          cursor: default;
        }
      }
    }

    .schema-inspect-overlay {
      position: absolute;
      inset: 0;
      z-index: 30;
      overflow: hidden;
      pointer-events: none;
    }

    .schema-inspect-highlight {
      position: absolute;
      box-sizing: border-box;
      border: 1px solid #00b578;
      border-radius: 2px;
      background: rgba(0, 181, 120, 0.1);

      .schema-inspect-label {
        position: absolute;
        top: 0;
        left: 0;
        transform: translateY(-100%);
        padding: 0 6px;
        border-radius: 4px 4px 4px 0;
        background: #00b578;
        color: #fff;
        font-size: 12px;
        line-height: 18px;
        white-space: nowrap;
      }

      &.is-label-inside .schema-inspect-label {
        transform: none;
        border-radius: 0 0 4px 0;
      }
    }
  }
}

.genui-template-chat {
  width: 100%;
  min-height: 0;
}

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

.schema-version-container {
  flex: 1;
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  box-sizing: border-box;
  min-height: 0;
  overflow: hidden;
  background: #fff;

  &__header {
    flex-shrink: 0;
    box-sizing: border-box;
    height: @schema-toolbar-height;
    min-height: @schema-toolbar-height;
    max-height: @schema-toolbar-height;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 0 14px;
    border-bottom: 1px solid rgb(232, 232, 232);
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: rgb(25, 25, 25);
    line-height: 22px;
  }

  &__header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
}
</style>
