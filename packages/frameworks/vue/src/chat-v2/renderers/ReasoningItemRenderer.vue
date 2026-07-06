<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { IconArrowDown } from '@opentiny/tiny-robot-svgs';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import { useI18n } from '../../chat/i18n';
import { useMarkdownHtml } from '../composables/useMarkdownHtml';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);
const { t } = useI18n();

const open = ref(false);

const reasoningItem = computed(() => content.value as { content?: string; thinking?: boolean });

const textContent = computed(() => String(reasoningItem.value?.content ?? ''));
const thinking = computed(() => reasoningItem.value?.thinking ?? false);

watch(
  thinking,
  (value) => {
    if (value) {
      open.value = true;
    }
  },
  { immediate: true },
);

const { html: markdownContent, ready: markdownReady } = useMarkdownHtml(textContent);

const handleClick = () => {
  open.value = !open.value;
};
</script>

<template>
  <div class="tr-bubble__reasoning" data-type="reasoning">
    <div class="header" @click="handleClick">
      <div class="icon-and-text" :class="{ thinking }">
        <svg
          class="thinking-icon"
          width="1em"
          height="1em"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <path
            d="M20.2 20.2c2.04-2.03.02-7.36-4.5-11.9-4.54-4.52-9.87-6.54-11.9-4.5-2.04 2.03-.02 7.36 4.5 11.9 4.54 4.52 9.87 6.54 11.9 4.5Z"
          />
          <path
            d="M15.7 15.7c4.52-4.54 6.54-9.87 4.5-11.9-2.03-2.04-7.36-.02-11.9 4.5-4.52 4.54-6.54 9.87-4.5 11.9 2.03 2.04 7.36.02 11.9-4.5Z"
          />
        </svg>
        <span class="title">{{ thinking ? t('reasoning.thinking') : t('reasoning.thinkingEnd') }}</span>
      </div>
      <IconArrowDown class="expand-icon" :class="{ '-rotate-90': !open }" />
    </div>
    <div v-show="open" class="detail">
      <div class="side-border">
        <div class="dot-wrapper">
          <div class="dot"></div>
        </div>
        <div class="border-line"></div>
      </div>
      <div
        v-if="markdownReady && markdownContent"
        class="detail-content markdown-content markdown-body"
        v-html="markdownContent"
      />
      <div v-else-if="textContent" class="detail-content">{{ textContent }}</div>
    </div>
  </div>
</template>

<style scoped lang="less">
.tr-bubble__reasoning:not(:last-child) {
  margin-top: 8px;
}

.header {
  font-size: 16px;
  line-height: 1.5;
  color: var(--tr-text-secondary);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;

  &:hover {
    color: var(--tr-text-primary);
    fill: var(--tr-text-primary);
  }

  .icon-and-text {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .expand-icon.-rotate-90 {
    transform: rotate(-90deg);
  }
}

@keyframes thinking-pulse {
  20% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  80% {
    opacity: 1;
  }
}

.thinking {
  animation: thinking-pulse 1.5s infinite linear;
}

.detail {
  color: var(--tr-text-secondary);
  margin-block: 8px;
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;

  .detail-content {
    max-height: 300px;
    overflow-y: auto;
    > *:first-child {
      margin-top: 0;
    }
    > *:last-child {
      margin-bottom: 0;
    }
  }

  .side-border {
    width: 16px;
    flex-shrink: 0;
    align-self: stretch;
    display: flex;
    flex-direction: column;
    align-items: center;

    .dot-wrapper {
      width: 4px;
      height: 16px;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }

    .dot {
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background-color: var(--tr-text-primary);
    }

    .border-line {
      flex: 1;
      width: 1.5px;
      background-color: #c2c2c2;
      border-radius: 1px;
    }
  }
}
</style>
