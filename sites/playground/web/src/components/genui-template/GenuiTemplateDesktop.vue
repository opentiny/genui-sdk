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
import { t } from '../../i18n';

defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const TinyCloseIcon = iconClose();
const { schema, conversation, versionControl, editor, ui, actions } = useTemplateContext();

const rendererSchema = computed(() => {
  const preview = schema.currentPreviewSchema ?? schema.currentSchema;
  return isRenderableSchema(preview) ? preview : null;
});

const rendererSchemaKey = computed(() => {
  const preview = rendererSchema.value as Record<string, unknown> | null;
  const componentName = preview?.componentName ?? 'schema';
  return `${schema.currentCardId || 'preview'}-${String(componentName)}`;
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
          <schema-renderer
            :key="rendererSchemaKey"
            class="schema-renderer"
            :content="rendererSchema"
            :generating="false"
            :is-json-complete="schema.currentPreviewSchemaComplete"
          />
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
