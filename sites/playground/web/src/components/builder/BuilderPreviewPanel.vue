<script setup lang="ts">
import { computed } from 'vue';
import { GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { TinyButton } from '@opentiny/vue';
import { iconClose, IconTime } from '@opentiny/vue-icon';
import viewSchemaIcon from '../../assets/images/view-schema.svg';
import { useBuilderPreview } from '../../builder';
import { useIsMobile } from '../../hooks';
import BuilderSchemaEditor from './BuilderSchemaEditor.vue';
import BuilderHistoryPanel from './BuilderHistoryPanel.vue';

const props = defineProps({
  theme: {
    type: String,
    default: 'light',
  },
});

const TinyCloseIcon = iconClose();
const TinyIconTime = IconTime();
const { isMobile } = useIsMobile();

const {
  activeCardId,
  activeCardSchemaRaw,
  schemaEditorText,
  schemaEditorVisible,
  toggleSchemaEditor,
  closeSchemaEditor,
  closePreview,
  syncSchemaFromEditor,
  historyPanelVisible,
  toggleHistoryPanel,
  resetToLatestVersion,
  applyCurrentVersion,
  showVersionActionButtons,
} = useBuilderPreview();

const schemaEditor = computed({
  get() {
    return schemaEditorText.value;
  },
  set(value: string) {
    syncSchemaFromEditor(value);
  },
});

const showMobileSchemaEditor = computed(
  () => isMobile.value && schemaEditorVisible.value,
);

const handleSchemaToggle = () => {
  if (isMobile.value && schemaEditorVisible.value) {
    closeSchemaEditor();
    return;
  }
  toggleSchemaEditor();
};
</script>

<template>
  <div class="builder-preview">
    <div class="builder-preview__wrapper">
      <div class="builder-preview__toolbar">
        <button
          type="button"
          class="builder-preview__schema-toggle"
          :aria-label="showMobileSchemaEditor ? '返回预览' : '查看 Schema'"
          @click="handleSchemaToggle"
        >
          <img class="builder-preview__schema-toggle-icon" :src="viewSchemaIcon" alt="" />
          <span class="builder-preview__schema-toggle-text">
            {{ showMobileSchemaEditor ? '返回预览' : '查看 Schema' }}
          </span>
        </button>
        <div class="builder-preview__toolbar-right">
          <tiny-button
            v-if="showVersionActionButtons"
            type="default"
            round
            class="builder-preview__action-btn"
            @click="resetToLatestVersion"
          >
            返回最新版本
          </tiny-button>
          <tiny-button
            v-if="showVersionActionButtons"
            type="primary"
            round
            class="builder-preview__action-btn"
            @click="applyCurrentVersion"
          >
            应用此版本
          </tiny-button>
          <tiny-button
            type="text"
            class="builder-preview__icon-btn"
            :class="{ 'builder-preview__icon-btn--active': historyPanelVisible }"
            :icon="TinyIconTime"
            aria-label="版本记录"
            @click="toggleHistoryPanel"
          />
          <tiny-button
            type="text"
            class="builder-preview__icon-btn"
            :icon="TinyCloseIcon"
            aria-label="关闭预览区"
            @click="closePreview"
          />
        </div>
      </div>
      <div class="builder-preview__body">
        <schema-renderer
          v-if="activeCardSchemaRaw"
          v-show="!showMobileSchemaEditor"
          class="builder-preview__renderer"
          :content="activeCardSchemaRaw"
          :generating="false"
          :is-json-complete="true"
        />
        <Transition name="builder-schema-overlay">
          <div v-if="showMobileSchemaEditor" class="builder-preview__schema-overlay">
            <builder-schema-editor
              :key="`schema-editor-mobile-${activeCardId}`"
              v-model="schemaEditor"
              :theme="props.theme"
              @close="closeSchemaEditor"
            />
          </div>
        </Transition>
        <Transition name="builder-history-panel">
          <builder-history-panel v-if="historyPanelVisible" />
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@schema-toolbar-height: 64px;

.builder-preview {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  box-sizing: border-box;

  &__wrapper {
    background-color: var(--tr-bubble-content-bg, #fff);
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    position: relative;
    border-left: 1px solid rgb(232, 232, 232);
  }

  &__toolbar {
    flex-shrink: 0;
    box-sizing: border-box;
    height: @schema-toolbar-height;
    min-height: @schema-toolbar-height;
    max-height: @schema-toolbar-height;
    border-bottom: 1px solid rgb(232, 232, 232);
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  &__schema-toggle {
    display: inline-flex;
    align-items: center;
    flex-shrink: 0;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: none;
    background: transparent;
    font: inherit;
    color: var(--tr-text-primary, rgb(25, 25, 25));
    cursor: pointer;

    &:hover {
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    &-icon {
      width: 16px;
      height: 16px;
      margin-right: 6px;
      flex-shrink: 0;
    }

    &-text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  &__toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
    min-width: 0;

    :deep(.tiny-button) {
      margin: 0;
    }
  }

  &__action-btn {
    flex-shrink: 0;
  }

  &__icon-btn {
    flex-shrink: 0;

    &.tiny-button {
      box-sizing: border-box;
      min-width: 32px;
      width: 32px;
      height: 32px;
      padding: 0;
      color: var(--tr-text-secondary, rgb(102, 102, 102));
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;

      &:hover {
        color: var(--tr-text-primary, rgb(25, 25, 25));
        background: rgba(0, 0, 0, 0.06);
      }
    }

    &--active {
      color: var(--tr-color-primary, #1677ff);
      background: rgba(22, 119, 255, 0.08);
    }
  }

  &__body {
    position: relative;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__renderer {
    flex: 1;
    padding: 20px;
    overflow: auto;
    box-sizing: border-box;
    min-height: 0;
  }

  &__schema-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--tr-bubble-content-bg, #fff);
  }
}

.builder-schema-overlay-enter-active,
.builder-schema-overlay-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}

.builder-schema-overlay-enter-from,
.builder-schema-overlay-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.builder-history-panel-enter-active,
.builder-history-panel-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.22s ease;
}

.builder-history-panel-enter-from,
.builder-history-panel-leave-to {
  opacity: 0;
  transform: translateX(16px);
}

@media (max-width: 768px) {
  .builder-preview {
    &__wrapper {
      border-left: none;
      border-top: 1px solid rgb(232, 232, 232);
    }

    &__toolbar {
      padding: 0 12px;
      gap: 6px;
    }

    &__action-btn {
      display: none;
    }

    &__renderer {
      padding: 12px;
    }

    &__schema-overlay {
      :deep(.builder-schema-editor__header) {
        padding: 12px 12px 0;
      }

      :deep(.builder-schema-editor__body) {
        padding: 8px 12px 12px;
      }
    }
  }
}
</style>
