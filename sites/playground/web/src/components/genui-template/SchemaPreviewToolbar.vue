<script setup lang="ts">
import { computed } from 'vue';
import { TinyButton } from '@opentiny/vue';
import { iconClose, iconTime } from '@opentiny/vue-icon';
import { useTemplateContext } from './composables';
import InspectModeIcon from './InspectModeIcon.vue';
import { useSchemaDevMode } from './useSchemaDevMode';
import viewSchemaIcon from '../../assets/images/view-schema.svg';
import { t } from '../../i18n';

withDefaults(defineProps<{
  variant: 'desktop' | 'mobile-footer';
}>(), {});

const TinyCloseIcon = iconClose();
const TinyIconTime = iconTime();
const { versionControl, ui, actions } = useTemplateContext();
const schemaDevMode = useSchemaDevMode();
const isDevMode = computed(() => schemaDevMode.isDevMode.value);

const toggleDevMode = () => {
  schemaDevMode.isDevMode.value = !schemaDevMode.isDevMode.value;
};
</script>

<template>
  <div v-if="variant === 'desktop'" class="schema-preview-toolbar schema-preview-toolbar--desktop">
    <button type="button" class="schema-toggle-text" @click="actions.toggleSchemaEditor">
      <img class="button-svg-icon" :src="viewSchemaIcon" alt="" />
      {{ versionControl.schemaEditorShowDiffView ? t('templateEditor.viewChanges') : t('templateEditor.viewJson') }}
    </button>
    <div class="schema-preview-toolbar__actions">
      <template v-if="versionControl.showReturnLatestButton">
        <tiny-button round @click="actions.applyCurrentVersion">
          {{ t('templateEditor.applyVersion') }}
        </tiny-button>
        <tiny-button type="primary" round @click="actions.resetToLatestVersion">
          {{ t('templateEditor.returnLatest') }}
        </tiny-button>
      </template>
      <button
        type="button"
        class="genui-schema-toolbar-close-btn genui-schema-toolbar-inspect-btn"
        :class="{ 'is-active': isDevMode }"
        :aria-label="t('templateEditor.devMode')"
        :title="t('templateEditor.devMode')"
        :aria-pressed="isDevMode"
        @click="toggleDevMode"
      >
        <InspectModeIcon />
      </button>
      <tiny-button
        type="text"
        class="genui-schema-toolbar-close-btn"
        :class="{ 'is-active': ui.isHistoryPanelOpen }"
        :icon="TinyIconTime"
        :aria-label="t('templateEditor.history')"
        :title="t('templateEditor.history')"
        @click="ui.toggleHistoryPanel"
      />
      <tiny-button
        type="text"
        class="genui-schema-toolbar-close-btn"
        :icon="TinyCloseIcon"
        :aria-label="t('templateEditor.closePreview')"
        @click="actions.closeRendererPanel"
      />
    </div>
  </div>
  <div v-else class="schema-preview-toolbar schema-preview-toolbar--mobile-footer">
    <tiny-button round class="schema-preview-toolbar__latest-btn" @click="actions.applyCurrentVersion">
      {{ t('templateEditor.applyVersion') }}
    </tiny-button>
    <tiny-button type="primary" round class="schema-preview-toolbar__latest-btn" @click="actions.resetToLatestVersion">
      {{ t('templateEditor.returnLatest') }}
    </tiny-button>
  </div>
</template>

<style scoped lang="less">
@schema-toolbar-height: 64px;

.schema-preview-toolbar--desktop {
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
    cursor: pointer;
    user-select: none;

    &:hover {
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    &:focus-visible {
      outline: 2px solid #1890ff;
      outline-offset: 2px;
      border-radius: 4px;
    }
  }
}

.schema-preview-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.schema-preview-toolbar--mobile-footer {
  z-index: 3;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #fff;
}

.schema-preview-toolbar__latest-btn {
  flex-shrink: 1;
  min-width: 0;
}

.genui-schema-toolbar-close-btn {
  flex-shrink: 0;
}

.genui-schema-toolbar-inspect-btn {
  box-sizing: border-box;
  min-width: 32px;
  width: 32px;
  height: 32px;
  min-height: 32px;
  margin: 0;
  padding: 0;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #666;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  line-height: 0;

  &:hover {
    color: #191919;
    background: rgba(0, 0, 0, 0.06);
  }

  &:active {
    background: rgba(0, 0, 0, 0.08);
  }

  &:focus-visible {
    outline: 2px solid #1890ff;
    outline-offset: 2px;
  }

  &.is-active {
    color: #1677ff;
    background: rgba(22, 119, 255, 0.1);

    &:hover {
      color: #1677ff;
      background: rgba(22, 119, 255, 0.16);
    }
  }
}

.genui-schema-toolbar-close-btn.tiny-button.tiny-button--text {
  box-sizing: border-box;
  min-width: 32px;
  width: 32px;
  height: 32px;
  min-height: 32px;
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

    &:hover {
      color: #1677ff;
      background: rgba(22, 119, 255, 0.16);
    }
  }
}
</style>
