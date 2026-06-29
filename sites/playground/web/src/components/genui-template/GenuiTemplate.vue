<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { CodeEditor } from 'monaco-editor-vue3';
import { GenuiConfigProvider, GenuiRenderer as SchemaRenderer } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { TinyButton } from '@opentiny/vue';
import { iconClose } from '@opentiny/vue-icon';
import type { Conversation } from '@opentiny/tiny-robot-kit';
import type { IMessage } from '@opentiny/genui-sdk-vue';
import type { ISchemaCardMessageItem, IJsonPatchMessageItem } from './chat.types';
import GenuiTemplateChat from './GenuiTemplateChat.vue';
import GenuiTemplateMobileSheet from './GenuiTemplateMobileSheet.vue';
import InspectModeIcon from './InspectModeIcon.vue';
import useTemplate from './useTemplate';
import { useIsMobile } from '../../use-mobile';
import { useMonacoPlaygroundTheme } from './use-monaco-playground-theme';
import { provideSchemaDevMode } from './useSchemaDevMode';
import { useSchemaRendererInspect } from './useSchemaRendererInspect';
import viewSchemaIcon from '../../assets/images/view-schema.svg';
import { locale, t } from '../../i18n';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue';

const { isMobile } = useIsMobile();
const { isDevMode, insertComposerTag, clearComposer } = provideSchemaDevMode();

const TinyCloseIcon = iconClose();

const {
  currentSchema,
  setCurrentSchema,
  setCurrentPreviewSchema,
  currentPreviewSchema,
  currentPreviewSchemaComplete,
  templateConversationState,
  conversation,
  currentCardId,
} = useTemplate();
const props = defineProps<{
  theme: 'light' | 'dark' | 'lite' | 'auto';
}>();

const monacoTheme = useMonacoPlaygroundTheme(() => props.theme);

const {
  containerRef: rendererContainerRef,
  onMouseMove: handleRendererMouseMove,
  onMouseLeave: handleRendererMouseLeave,
  onClick: handleRendererInspectClick,
} = useSchemaRendererInspect({
  isDevMode,
  schema: currentPreviewSchema,
  insertComposerTag,
});

// 桌面：右侧预览列是否展开（关闭后仅占聊天列；切换会话或点击版本卡片会重新展开）
const rendererPanelVisible = ref(true);
// schema 编辑器是否可见（移动端：底部抽屉；抽屉内先预览再可打开 JSON）
const schemaEditorVisible = ref(false);
const mobileSchemaJsonEditorOpen = ref(false);
const MOBILE_SHEET_DEFAULT_HEIGHT_VH = 64;
const MOBILE_SHEET_MIN_HEIGHT_VH = 42;
const MOBILE_SHEET_MAX_HEIGHT_VH = 92;
const mobileSheetHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
const mobileSheetDragStartY = ref(0);
const mobileSheetDragStartHeightVh = ref(MOBILE_SHEET_DEFAULT_HEIGHT_VH);
const mobileSheetDragging = ref(false);
const latestSchemaCardId = computed(() => {
  const conversationState = templateConversationState.value;
  const currentConversation = conversationState?.conversations?.find(
    (item: Conversation) => item.id === conversationState.currentId,
  );
  const lastMessage = currentConversation?.messages?.[currentConversation.messages.length - 1] as IMessage | undefined;
  const schemaMessage = lastMessage?.messages?.find(
    (message): message is ISchemaCardMessageItem | IJsonPatchMessageItem =>
      message.type === 'schema-card' || message.type === 'json-patch',
  );

  return schemaMessage?.cardId ?? '';
});
// 仅当正在查看历史版本时显示“返回最新版本/应用此版本”
const showReturnLatestButton = computed(() =>
  Boolean(currentCardId.value && latestSchemaCardId.value && currentCardId.value !== latestSchemaCardId.value),
);
// 历史版本在未“应用此版本”前禁止编辑
const isHistoryVersionApplied = ref(true);
const isSchemaEditorReadonly = computed(() => showReturnLatestButton.value && !isHistoryVersionApplied.value);
// 编辑器中显示的代码
const schemaEditor = computed({
  get() {
    // 写入编辑器的代码
    if (!currentPreviewSchema.value) {
      schemaEditorVisible.value = false;
      return '{}';
    }

    return JSON.stringify(currentPreviewSchema.value, null, 2);
  },
  set(value: string) {
    // 在编辑器中编辑代码
    try {
      const schema = JSON.parse(value || '{}');
      setCurrentPreviewSchema(schema);
      // 防御式保护：历史版本未应用时，不允许通过编辑器回写当前生效 schema。
      if (!isSchemaEditorReadonly.value) {
        setCurrentSchema(schema);
      }
    } catch (error) {
      console.error('schemaEditor set error ===>', error);
    }
  },
});

const editorOptions = computed(() => ({
  fontSize: 14,
  minimap: { enabled: false },
  automaticLayout: true,
  folding: true,
  foldingHighlight: true,
  foldingStrategy: 'indentation',
  formatOnPaste: true,
  readOnly: isSchemaEditorReadonly.value,
}));

const toggleSchemaEditor = () => {
  schemaEditorVisible.value = !schemaEditorVisible.value;
  if (isMobile.value) {
    mobileSchemaJsonEditorOpen.value = false;
  }
};

const closeSchemaEditorView = () => {
  schemaEditorVisible.value = false;
  mobileSchemaJsonEditorOpen.value = false;
  mobileSheetDragging.value = false;
  mobileSheetHeightVh.value = MOBILE_SHEET_DEFAULT_HEIGHT_VH;
};

const closeRendererPanel = () => {
  rendererPanelVisible.value = false;
  closeSchemaEditorView();
};

const onMobileSheetMaskClick = () => {
  if (mobileSchemaJsonEditorOpen.value) {
    mobileSchemaJsonEditorOpen.value = false;
  }
};

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

const removeMobileSheetDragListeners = () => {
  window.removeEventListener('touchmove', handleMobileSheetDragMove);
  window.removeEventListener('touchend', handleMobileSheetDragEnd);
  window.removeEventListener('touchcancel', handleMobileSheetDragEnd);
};

function handleMobileSheetDragEnd() {
  if (!mobileSheetDragging.value) {
    return;
  }
  mobileSheetDragging.value = false;
  removeMobileSheetDragListeners();
  mobileSheetHeightVh.value = clampMobileSheetHeight(mobileSheetHeightVh.value);
}

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

const toggleSchemaVersion = (schema: Record<string, unknown>, cardId: string) => {
  rendererPanelVisible.value = true;
  currentCardId.value = cardId;
  isHistoryVersionApplied.value = false;
  const isLatestVersion = cardId === latestSchemaCardId.value;
  setCurrentPreviewSchema(schema);
  if (isLatestVersion) {
    setCurrentSchema(schema);
  }
  // 移动端：先打开底部抽屉仅展示渲染预览；JSON 编辑器由抽屉内「查看 Schema」再打开
  if (isMobile.value) {
    mobileSchemaJsonEditorOpen.value = false;
    schemaEditorVisible.value = true;
    mobileSheetHeightVh.value = MOBILE_SHEET_DEFAULT_HEIGHT_VH;
  }
};

const applyCurrentVersion = () => {
  isHistoryVersionApplied.value = true;
  setCurrentSchema(currentPreviewSchema.value);
};

const resetToLatestVersion = () => {
  // 获取最新版本的 schema
  const conversationState = templateConversationState.value;
  if (!conversationState) {
    return;
  }
  const currentConversation = conversationState.conversations.find(
    (conversation: Conversation) => conversation.id === conversationState.currentId,
  );
  const lastMessage = currentConversation?.messages?.[currentConversation?.messages.length - 1] as IMessage | undefined;
  const schemaMessage = lastMessage?.messages?.find(
    (message): message is ISchemaCardMessageItem | IJsonPatchMessageItem =>
      message.type === 'schema-card' || message.type === 'json-patch',
  );
  const latestSchema = schemaMessage?.schema;
  currentCardId.value = schemaMessage?.cardId ?? '';
  isHistoryVersionApplied.value = true;
  if (latestSchema) {
    try {
      const parsedLatestSchema = JSON.parse(latestSchema);
      setCurrentSchema(parsedLatestSchema);
      setCurrentPreviewSchema(parsedLatestSchema);
    } catch (error) {
      console.error('Failed to restore latest schema:', error);
    }
  }
  if (isMobile.value) {
    mobileSchemaJsonEditorOpen.value = false;
  }
};

// 按 Esc：移动端先关 JSON 第二层，再关整个抽屉
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    if (isMobile.value && schemaEditorVisible.value && mobileSchemaJsonEditorOpen.value) {
      mobileSchemaJsonEditorOpen.value = false;
      return;
    }
    if (isMobile.value) {
      if (schemaEditorVisible.value) {
        closeSchemaEditorView();
      }
      return;
    }
    if (schemaEditorVisible.value) {
      closeSchemaEditorView();
    }
  }
};

const currentConversationId = computed(() => conversation?.state.currentId);

watch(currentConversationId, () => {
  schemaEditorVisible.value = false;
  mobileSchemaJsonEditorOpen.value = false;
  currentCardId.value = '';
  isHistoryVersionApplied.value = true;
  rendererPanelVisible.value = true;
  clearComposer();
});

onMounted(() => {
  resetToLatestVersion();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  removeMobileSheetDragListeners();
});
</script>

<template>
  <GenuiConfigProvider
    :theme="theme"
    :locale="locale"
    :materials="materials"
    :renderer-config="rendererConfig"
    style="width: 100%; height: 100%"
  >
    <div :class="['genui-schema-template', { 'is-mobile': isMobile }]">
      <div class="genui-schema-template-item chat-container">
        <genui-template-chat
          v-show="!schemaEditorVisible || isMobile"
          class="genui-template-chat"
          @schema-version-toggle="toggleSchemaVersion"
        />
        <div class="schema-version-container" v-show="schemaEditorVisible && !isMobile">
          <div class="schema-version-container__header">
            <span class="schema-version-container__title">SchemaJSON</span>
            <tiny-button
              type="text"
              class="genui-schema-toolbar-close-btn"
              :icon="TinyCloseIcon"
              :aria-label="t('templateEditor.close')"
              @click="closeSchemaEditorView"
            />
          </div>
          <div class="schema-version-container__editor">
            <code-editor
              v-model:value="schemaEditor"
              language="json"
              :theme="monacoTheme"
              :options="editorOptions"
            />
          </div>
        </div>
      </div>
      <genui-template-mobile-sheet
        v-if="isMobile"
        :visible="isMobile && schemaEditorVisible"
        :json-editor-open="mobileSchemaJsonEditorOpen"
        :panel-style="mobileSheetPanelStyle"
        :show-return-latest-button="showReturnLatestButton"
        :current-preview-schema="currentPreviewSchema"
        :current-preview-schema-complete="currentPreviewSchemaComplete"
        :schema-editor="schemaEditor"
        :editor-options="editorOptions"
        :playground-theme="theme"
        :view-schema-icon="viewSchemaIcon"
        :close-icon="TinyCloseIcon"
        @update:json-editor-open="mobileSchemaJsonEditorOpen = $event"
        @update:schema-editor="schemaEditor = $event"
        @mask-click="onMobileSheetMaskClick"
        @grab-touch-start="onMobileSheetGrabTouchStart"
        @close="closeSchemaEditorView"
        @apply-current-version="applyCurrentVersion"
        @reset-to-latest-version="resetToLatestVersion"
      />
      <template v-else>
        <div
          class="genui-schema-template-item renderer-container"
          v-if="currentPreviewSchema && rendererPanelVisible"
        >
          <div class="renderer-container-wrapper">
            <div class="top-button-group">
              <button type="button" class="schema-toggle-text" @click="toggleSchemaEditor">
                <img class="button-svg-icon" :src="viewSchemaIcon" alt="" />
                {{ t('templateEditor.viewJson') }}
              </button>
              <div class="top-button-group-right">
                <button
                  type="button"
                  class="dev-mode-toggle"
                  :class="{ 'is-active': isDevMode }"
                  :aria-label="t('templateEditor.devMode')"
                  :title="t('templateEditor.devMode')"
                  @click="isDevMode = !isDevMode"
                >
                  <InspectModeIcon class="dev-mode-toggle__icon" />
                </button>
                <tiny-button v-if="showReturnLatestButton" type="primary" round @click="resetToLatestVersion">{{
                  t('templateEditor.returnLatest')
                }}</tiny-button>
                <tiny-button v-if="showReturnLatestButton" round @click="applyCurrentVersion">
                  {{ t('templateEditor.applyVersion') }}
                </tiny-button>
                <tiny-button
                  type="text"
                  class="genui-schema-toolbar-close-btn"
                  :icon="TinyCloseIcon"
                  :aria-label="t('templateEditor.closePreview')"
                  @click="closeRendererPanel"
                />
              </div>
            </div>
            <div
              ref="rendererContainerRef"
              :class="['schema-renderer', { 'is-inspectable': isDevMode }]"
              @mousemove="handleRendererMouseMove"
              @mouseleave="handleRendererMouseLeave"
              @click.capture="handleRendererInspectClick"
            >
              <schema-renderer
                :content="currentPreviewSchema"
                :generating="false"
                :isJsonComplete="currentPreviewSchemaComplete"
              />
            </div>
          </div>
        </div>
      </template>
    </div>
  </GenuiConfigProvider>
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

  & .chat-container {
    display: flex;
    height: 100%;
    min-height: 0;
    overflow: hidden;
  }

  & .renderer-container {
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

      .top-button-group {
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

        .button-svg-icon {
          width: 16px;
          height: 16px;
          margin-right: 6px;
          vertical-align: middle;
        }

        .schema-toggle-text {
          display: inline-flex;
          align-items: center;
          margin: 0;
          padding: 0;
          border: none;
          background: transparent;
          font: inherit;
          text-align: inherit;
          color: #191919;
          text-decoration: none;
          cursor: pointer;
          user-select: none;

          &:hover {
            color: #191919;
            text-decoration: underline;
            text-underline-offset: 2px;
          }

          &:focus-visible {
            outline: 2px solid #1890ff;
            outline-offset: 2px;
            border-radius: 4px;
          }
        }

        .top-button-group-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
      }

      .schema-renderer {
        flex: 1;
        padding: 20px;
        overflow: auto;
        box-sizing: border-box;

        &.is-inspectable {
          cursor: default;

          :deep([data-id]) {
            cursor: default;
          }

          :deep([data-id].is-schema-hovered:not(.is-schema-selected)) {
            outline: 2px solid #1890ff;
            outline-offset: -2px;
          }

          :deep([data-id].is-schema-selected) {
            outline: 2px solid #1890ff;
            outline-offset: -2px;
            box-shadow: inset 0 0 0 2px rgba(24, 144, 255, 0.15);
          }
        }
      }
    }
  }

  &.is-mobile {
    flex-direction: column-reverse;
    margin-bottom: 0;

    .genui-schema-template-item {
      flex: 1 1 50%;
      min-height: 0;
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

  &__editor {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__editor :deep(.monaco-code-editor) {
    flex: 1;
    min-height: 0;
  }
}

.dev-mode-toggle {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #666;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;

  &:hover {
    color: #191919;
    background: rgba(0, 0, 0, 0.06);
  }

  &:focus-visible {
    outline: 2px solid #1890ff;
    outline-offset: 2px;
  }

  &.is-active {
    color: #6cb6ff;
    background: transparent;

    &:hover {
      color: #6cb6ff;
      background: rgba(0, 0, 0, 0.06);
    }
  }

  &__icon {
    flex-shrink: 0;
  }
}
</style>
