<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { TinyButton } from '@opentiny/vue';
import { iconClose } from '@opentiny/vue-icon';
import type { PlaygroundColorTheme } from './composables/use-monaco-playground-theme';
import { useTemplateContext } from './composables';
import { t } from '../../i18n';

const props = defineProps<{
  theme?: PlaygroundColorTheme;
}>();

const TinyCloseIcon = iconClose();
const { versionControl, ui, actions } = useTemplateContext();

const isDark = computed(() => props.theme === 'dark');
const collapsedGroups = ref<Record<string, boolean>>({});

watch(
  () => versionControl.schemaVersionHistoryGroups.map((group) => group.label),
  (labels) => {
    for (const label of labels) {
      if (!(label in collapsedGroups.value)) {
        collapsedGroups.value[label] = false;
      }
    }
  },
  { immediate: true },
);

const isGroupCollapsed = (label: string) => collapsedGroups.value[label] ?? false;

const toggleGroup = (label: string) => {
  collapsedGroups.value[label] = !isGroupCollapsed(label);
};
</script>

<template>
  <Transition name="schema-history-panel">
    <aside
      v-if="ui.isHistoryPanelOpen"
      class="schema-version-history-panel"
      :class="{ 'is-dark': isDark }"
      role="complementary"
      :aria-label="t('templateEditor.history')"
    >
      <header class="schema-version-history-panel__header">
        <h3 class="schema-version-history-panel__title">{{ t('templateEditor.history') }}</h3>
        <tiny-button
          type="text"
          class="schema-version-history-panel__close"
          :icon="TinyCloseIcon"
          :aria-label="t('templateEditor.closeHistory')"
          @click="ui.closeHistoryPanel"
        />
      </header>

      <div class="schema-version-history-panel__body">
        <template v-if="versionControl.schemaVersionHistoryGroups.length">
          <section
            v-for="group in versionControl.schemaVersionHistoryGroups"
            :key="group.label"
            class="schema-version-history-panel__section"
          >
            <button
              type="button"
              class="schema-version-history-panel__section-title"
              :aria-expanded="!isGroupCollapsed(group.label)"
              @click="toggleGroup(group.label)"
            >
              <svg
                class="schema-version-history-panel__section-chevron"
                :class="{ 'is-collapsed': isGroupCollapsed(group.label) }"
                width="10"
                height="10"
                viewBox="0 0 10 10"
                aria-hidden="true"
              >
                <path
                  d="M2 3.5L5 6.5L8 3.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span class="schema-version-history-panel__section-label">{{ group.label }}</span>
            </button>
            <div
              v-show="!isGroupCollapsed(group.label)"
              class="schema-version-history-panel__section-items"
            >
              <button
                v-for="entry in group.items"
                :key="entry.cardId"
                type="button"
                class="schema-version-history-panel__item"
                :class="{ 'is-active': entry.isCurrent, 'is-pending': entry.isPending }"
                @click="actions.handleHistoryEntrySelect(entry)"
              >
                <div class="schema-version-history-panel__item-main">
                  <div class="schema-version-history-panel__item-time">{{ entry.timeLabel }}</div>
                  <div class="schema-version-history-panel__item-desc">{{ entry.description }}</div>
                </div>
              </button>
            </div>
          </section>
        </template>
        <div v-else class="schema-version-history-panel__empty">{{ t('templateEditor.historyEmpty') }}</div>
      </div>
    </aside>
  </Transition>
</template>

<style scoped lang="less">
.schema-version-history-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  min-width: 280px;
  z-index: 12;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
  border-left: 1px solid #e8e8e8;
  box-shadow: -8px 0 24px rgba(0, 0, 0, 0.08);
  box-sizing: border-box;

  &.is-dark {
    background: #262626;
    border-left-color: #404040;
    box-shadow: -8px 0 24px rgba(0, 0, 0, 0.35);

    .schema-version-history-panel__title {
      color: #f5f5f5;
    }

    .schema-version-history-panel__section-title {
      color: #8c8c8c;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
      }
    }

    .schema-version-history-panel__section-chevron {
      color: #8c8c8c;
    }

    .schema-version-history-panel__item {
      color: #f0f0f0;

      &:hover {
        background: rgba(255, 255, 255, 0.06);
      }
    }

    .schema-version-history-panel__item-time {
      color: #69b1ff;
    }

    .schema-version-history-panel__item-desc {
      color: #bfbfbf;
    }

    .schema-version-history-panel__empty {
      color: #8c8c8c;
    }
  }

  &__header {
    flex-shrink: 0;
    height: 64px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid #e8e8e8;
    box-sizing: border-box;
  }

  &__title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
    color: #191919;
  }

  &__close {
    flex-shrink: 0;
  }

  &__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 12px 8px 16px;
  }

  &__section + &__section {
    margin-top: 8px;
  }

  @section-title-padding-x: 8px;
  @chevron-size: 10px;
  @chevron-label-gap: 6px;
  @history-text-indent: @section-title-padding-x + @chevron-size + @chevron-label-gap;

  &__section-title {
    width: 100%;
    margin: 0;
    padding: 6px @section-title-padding-x;
    border: none;
    border-radius: 6px;
    background: transparent;
    display: flex;
    align-items: center;
    gap: @chevron-label-gap;
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
    color: #8c8c8c;
    cursor: pointer;
    box-sizing: border-box;
    text-align: left;
    transition: background-color 0.15s ease;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }
  }

  &__section-chevron {
    flex-shrink: 0;
    display: block;
    color: #8c8c8c;
    transition: transform 0.15s ease;

    &.is-collapsed {
      transform: rotate(-90deg);
    }
  }

  &__section-label {
    line-height: 20px;
  }

  &__section-items {
    padding-left: @history-text-indent;
  }

  &__item {
    width: 100%;
    margin: 0;
    padding: 10px @section-title-padding-x 10px 0;
    border: none;
    border-radius: 8px;
    background: transparent;
    text-align: left;
    cursor: pointer;
    box-sizing: border-box;
    transition: background-color 0.15s ease;
    display: block;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }

    &.is-pending .schema-version-history-panel__item-desc {
      color: #808080;
    }
  }

  &__item-time {
    font-size: 13px;
    font-weight: 600;
    line-height: 20px;
    color: #000;
  }

  &__item-desc {
    margin-top: 2px;
    font-size: 13px;
    line-height: 20px;
    color: #808080;
    word-break: break-word;
  }

  &__empty {
    padding: 24px 12px;
    text-align: center;
    font-size: 13px;
    color: #8c8c8c;
  }
}

.schema-history-panel-enter-active,
.schema-history-panel-leave-active {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.schema-history-panel-enter-from,
.schema-history-panel-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
