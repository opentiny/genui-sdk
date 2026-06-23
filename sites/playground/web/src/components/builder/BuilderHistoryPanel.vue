<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { TinyButton } from '@opentiny/vue';
import { iconClose } from '@opentiny/vue-icon';
import {
  groupBuilderHistoryFromCards,
  snapshotConversationBuilderCards,
  useBuilderConversationMessages,
  useBuilderPreview,
} from '../../builder';

const TinyCloseIcon = iconClose();
const { activeCardId, openCard, closeHistoryPanel } = useBuilderPreview();
const getConversationMessages = useBuilderConversationMessages();

const expandedDates = ref<Set<string>>(new Set());

const generatedSchemaCards = computed(() => {
  const getMessages = getConversationMessages.value;
  if (!getMessages) {
    return [];
  }

  return snapshotConversationBuilderCards(getMessages());
});

const dateGroups = computed(() => groupBuilderHistoryFromCards(generatedSchemaCards.value));

watch(
  [dateGroups, activeCardId],
  ([groups]) => {
    if (!groups.length) {
      expandedDates.value = new Set();
      return;
    }

    const next = new Set(expandedDates.value);
    const activeGroup = groups.find((group) => group.records.some((record) => record.id === activeCardId.value));

    if (activeGroup) {
      next.add(activeGroup.dateKey);
    } else if (!next.size) {
      next.add(groups[0].dateKey);
    }

    expandedDates.value = next;
  },
  { immediate: true },
);

const isDateExpanded = (dateKey: string) => expandedDates.value.has(dateKey);

const toggleDate = (dateKey: string) => {
  const next = new Set(expandedDates.value);
  if (next.has(dateKey)) {
    next.delete(dateKey);
  } else {
    next.add(dateKey);
  }
  expandedDates.value = next;
};

const handleRecordClick = (card: Parameters<typeof openCard>[0]) => {
  openCard(card);
};
</script>

<template>
  <aside class="builder-history-panel" aria-label="版本记录">
    <div class="builder-history-panel__header">
      <span class="builder-history-panel__title">历史记录</span>
      <tiny-button
        type="text"
        class="builder-history-panel__close"
        :icon="TinyCloseIcon"
        aria-label="关闭历史记录"
        @click="closeHistoryPanel"
      />
    </div>
    <div class="builder-history-panel__scroll">
      <div v-if="!dateGroups.length" class="builder-history-panel__empty">暂无对话生成的 Schema 记录</div>
      <section v-for="group in dateGroups" :key="group.dateKey" class="builder-history-panel__group">
        <button
          type="button"
          class="builder-history-panel__date"
          :aria-expanded="isDateExpanded(group.dateKey)"
          @click="toggleDate(group.dateKey)"
        >
          <span class="builder-history-panel__date-arrow-wrap">
            <span
              class="builder-history-panel__date-arrow"
              :class="{ 'builder-history-panel__date-arrow--expanded': isDateExpanded(group.dateKey) }"
            />
          </span>
          <span class="builder-history-panel__date-label">{{ group.dateLabel }}</span>
        </button>
        <div v-show="isDateExpanded(group.dateKey)" class="builder-history-panel__records">
          <button
            v-for="record in group.records"
            :key="record.id"
            type="button"
            class="builder-history-panel__record"
            :class="{ 'builder-history-panel__record--active': record.id === activeCardId }"
            @click="handleRecordClick(record.card)"
          >
            <div class="builder-history-panel__record-title">{{ record.timeLabel }}</div>
            <div class="builder-history-panel__record-desc">{{ record.documentName }}</div>
          </button>
        </div>
      </section>
    </div>
  </aside>
</template>

<style scoped lang="less">
.builder-history-panel {
  position: absolute;
  top: 0;
  right: 0;
  width: 50%;
  height: 100%;
  box-sizing: border-box;
  background: var(--tr-bubble-content-bg, #fff);
  border-left: 1px solid rgb(232, 232, 232);
  box-shadow: -4px 0 16px rgba(0, 0, 0, 0.06);
  z-index: 3;
  display: flex;
  flex-direction: column;
  min-height: 0;

  &__header {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 16px 16px 12px;
    border-bottom: 1px solid rgb(232, 232, 232);
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
    color: var(--tr-text-primary, rgb(25, 25, 25));
  }

  &__close {
    flex-shrink: 0;

    &.tiny-button {
      min-width: 32px;
      width: 32px;
      height: 32px;
      padding: 0;
      margin: 0;
      color: var(--tr-text-secondary, rgb(102, 102, 102));
      border-radius: 8px;

      &:hover {
        color: var(--tr-text-primary, rgb(25, 25, 25));
        background: rgba(0, 0, 0, 0.06);
      }
    }
  }

  &__scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 12px 0;
  }

  &__empty {
    padding: 24px 16px;
    font-size: 14px;
    line-height: 22px;
    color: var(--tr-text-secondary, rgb(128, 128, 128));
    text-align: center;
  }

  &__group {
    --history-title-offset: 32px;
  }

  &__group + &__group {
    margin-top: 4px;
  }

  &__date {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    margin: 0;
    padding: 10px 16px;
    border: none;
    background: transparent;
    font: inherit;
    color: var(--tr-text-primary, rgb(25, 25, 25));
    cursor: pointer;
    text-align: left;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }
  }

  &__date-label {
    font-size: 14px;
    font-weight: 600;
    line-height: 22px;
  }

  &__date-arrow-wrap {
    flex-shrink: 0;
    width: 8px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  &__date-arrow {
    flex-shrink: 0;
    width: 8px;
    height: 8px;
    border-right: 1.5px solid var(--tr-text-secondary, rgb(102, 102, 102));
    border-bottom: 1.5px solid var(--tr-text-secondary, rgb(102, 102, 102));
    transform: rotate(-45deg);
    transform-origin: center center;
    transition: transform 0.2s ease;

    &--expanded {
      transform: rotate(45deg);
    }
  }

  &__records {
    padding: 0 0 8px;
  }

  &__record {
    width: 100%;
    box-sizing: border-box;
    display: block;
    margin: 0;
    padding: 10px 16px 10px var(--history-title-offset);
    border: none;
    border-radius: 0;
    background: transparent;
    font: inherit;
    text-align: left;
    cursor: pointer;

    &:hover {
      background: rgba(0, 0, 0, 0.04);
    }

    &--active {
      background: color-mix(in srgb, var(--tr-color-primary, #1677ff) 8%, transparent);
    }
  }

  &__record-title {
    font-size: 14px;
    line-height: 22px;
    color: var(--tr-text-primary, rgb(25, 25, 25));
    font-weight: 500;
  }

  &__record-desc {
    margin-top: 2px;
    font-size: 12px;
    line-height: 18px;
    color: var(--tr-text-secondary, rgb(128, 128, 128));
    word-break: break-all;
  }
}
</style>
