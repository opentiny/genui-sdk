<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { TinyButton } from '@opentiny/vue';
import { iconClose, iconTime } from '@opentiny/vue-icon';
import SchemaVersionHistoryPanel from './SchemaVersionHistoryPanel.vue';
import SchemaJsonEditor from './SchemaJsonEditor.vue';
import SchemaPreviewToolbar from './SchemaPreviewToolbar.vue';
import { type PlaygroundColorTheme } from './composables/use-monaco-playground-theme';
import { useTemplateContext } from './composables';
import viewSchemaIcon from '../../assets/images/view-schema.svg';
import { t } from '../../i18n';

defineProps<{
  theme: PlaygroundColorTheme;
}>();

const MOBILE_SHEET_DEFAULT_HEIGHT_VH = 64;
const MOBILE_SHEET_MIN_HEIGHT_VH = 42;
const MOBILE_SHEET_MAX_HEIGHT_VH = 92;

const TinyCloseIcon = iconClose();
const TinyIconTime = iconTime();
const { schema, versionControl, editor, ui, actions } = useTemplateContext();

const mobileSheetHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
const mobileSheetDragStartY = ref(0);
const mobileSheetDragStartHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
const mobileSheetDragging = ref(false);

const mobileSheetPanelStyle = computed(() => ({
  height: `${mobileSheetHeightVh.value}vh`,
}));

const clampMobileSheetHeight = (heightVh: number) =>
  Math.min(MOBILE_SHEET_MAX_HEIGHT_VH, Math.max(MOBILE_SHEET_MIN_HEIGHT_VH, heightVh));

const handleMobileSheetDragMove = (event: TouchEvent) => {
  if (!mobileSheetDragging.value) {
    return;
  }
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  const deltaY = touch.clientY - mobileSheetDragStartY.value;
  const deltaVh = (deltaY / window.innerHeight) * 100;
  mobileSheetHeightVh.value = clampMobileSheetHeight(mobileSheetDragStartHeightVh.value - deltaVh);
  event.preventDefault();
};

const disposeMobileSheetDrag = () => {
  window.removeEventListener('touchmove', handleMobileSheetDragMove);
  window.removeEventListener('touchend', handleMobileSheetDragEnd);
  window.removeEventListener('touchcancel', handleMobileSheetDragEnd);
  mobileSheetDragging.value = false;
};

function handleMobileSheetDragEnd() {
  if (!mobileSheetDragging.value) {
    return;
  }
  disposeMobileSheetDrag();
  mobileSheetHeightVh.value = clampMobileSheetHeight(mobileSheetHeightVh.value);
}

const resetMobileSheetHeight = (options?: { resetDragging?: boolean }) => {
  if (options?.resetDragging !== false) {
    mobileSheetDragging.value = false;
  }
  mobileSheetHeightVh.value = MOBILE_SHEET_DEFAULT_HEIGHT_VH;
};

const onMobileSheetGrabTouchStart = (event: TouchEvent) => {
  const touch = event.touches[0];
  if (!touch) {
    return;
  }
  mobileSheetDragging.value = true;
  mobileSheetDragStartY.value = touch.clientY;
  mobileSheetDragStartHeightVh.value = mobileSheetHeightVh.value;
  window.addEventListener('touchmove', handleMobileSheetDragMove, { passive: false });
  window.addEventListener('touchend', handleMobileSheetDragEnd);
  window.addEventListener('touchcancel', handleMobileSheetDragEnd);
};

const onMaskClick = () => {
  if (ui.isJsonEditorActive) {
    actions.handleMobileJsonEditorOpen(false);
  }
};

watch(
  () => ui.rendererPanelVisible,
  (open) => {
    if (open) {
      resetMobileSheetHeight({ resetDragging: false });
      return;
    }
    resetMobileSheetHeight();
    disposeMobileSheetDrag();
  },
);

onUnmounted(() => {
  disposeMobileSheetDrag();
});

const headerTitle = computed(() => {
  if (!ui.isJsonEditorActive) {
    return t('templateEditor.previewRender');
  }
  return versionControl.schemaEditorShowDiffView
    ? t('templateEditor.viewChanges')
    : t('templateEditor.schemaJsonTitle');
});

const toggleJsonEditor = () => {
  actions.handleMobileJsonEditorOpen(!ui.isJsonEditorActive);
};
</script>

<template>
  <Teleport to="body">
    <Transition name="schema-mobile-sheet">
      <div
        v-show="ui.rendererPanelVisible"
        class="schema-mobile-sheet"
        role="dialog"
        aria-modal="true"
        :aria-label="
          ui.isJsonEditorActive
            ? versionControl.schemaEditorShowDiffView
              ? t('templateEditor.jsonEditorAria')
              : t('templateEditor.jsonPreviewAria')
            : t('templateEditor.jsonPreviewAria')
        "
      >
        <div class="schema-mobile-sheet__mask" @click="onMaskClick" />
        <div class="schema-mobile-sheet__panel" :style="mobileSheetPanelStyle">
          <div class="schema-mobile-sheet__grab" @touchstart="onMobileSheetGrabTouchStart" />
          <div class="schema-mobile-sheet__header">
            <h3 class="schema-mobile-sheet__title">{{ headerTitle }}</h3>
            <div class="schema-mobile-sheet__header-actions">
              <tiny-button
                v-if="ui.isJsonEditorActive && actions.schemaEditorDirty && !versionControl.schemaEditorShowDiffView && !versionControl.isEditorReadOnly"
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
                :class="{ 'is-active': ui.isHistoryPanelOpen }"
                :icon="TinyIconTime"
                :aria-label="t('templateEditor.history')"
                :title="t('templateEditor.history')"
                @click="ui.toggleHistoryPanel"
              />
              <button
                type="button"
                class="schema-mobile-sheet__icon-btn"
                :class="{ 'is-active': ui.isJsonEditorActive }"
                :aria-label="t('templateEditor.viewJson')"
                :title="t('templateEditor.viewJson')"
                @click="toggleJsonEditor"
              >
                <img class="schema-mobile-sheet__icon-btn-image" :src="viewSchemaIcon" alt="" />
              </button>
              <tiny-button
                type="text"
                class="genui-schema-toolbar-close-btn"
                :icon="TinyCloseIcon"
                :aria-label="t('templateEditor.close')"
                @click="actions.closeSchemaEditorView"
              />
            </div>
          </div>
          <div
            :class="['schema-mobile-sheet__body', { 'schema-mobile-sheet__body--with-footer': versionControl.showReturnLatestButton }]"
          >
            <div
              v-if="schema.currentPreviewSchema"
              v-show="!ui.isJsonEditorActive"
              class="schema-mobile-sheet__preview schema-mobile-sheet__preview--solo"
            >
              <schema-renderer
                class="schema-mobile-sheet-renderer"
                :content="schema.currentPreviewSchema"
                :generating="false"
                :is-json-complete="schema.currentPreviewSchemaComplete"
              />
            </div>
            <Transition name="schema-mobile-json">
              <div v-show="ui.isJsonEditorActive" class="schema-mobile-sheet__editor schema-mobile-sheet__editor--layer">
                <schema-json-editor :theme="theme" layout="sheet" />
              </div>
            </Transition>
            <schema-version-history-panel :theme="theme" />
          </div>
          <schema-preview-toolbar v-if="versionControl.showReturnLatestButton" variant="mobile-footer" />
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

    &.is-active {
      color: #1677ff;
      background: rgba(22, 119, 255, 0.1);
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

  &__title {
    flex: 1 1 0;
    min-width: 0;
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
    color: #191919;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__header-actions {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
  }

  &__icon-btn {
    box-sizing: border-box;
    width: 32px;
    height: 32px;
    margin: 0;
    padding: 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;

    &:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    &:active {
      background: rgba(0, 0, 0, 0.08);
    }

    &.is-active {
      background: rgba(22, 119, 255, 0.1);
    }
  }

  &__icon-btn-image {
    width: 16px;
    height: 16px;
    display: block;
    object-fit: contain;
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
