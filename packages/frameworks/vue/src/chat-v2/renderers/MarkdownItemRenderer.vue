<script setup lang="ts">
import { computed } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import { useMarkdownHtml } from '../composables/useMarkdownHtml';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);

const textContent = computed(() => {
  const item = content.value as { type?: string; content?: string; text?: string };
  if (item?.type === 'markdown' || item?.type === 'custom-text') {
    return String(item.content ?? '');
  }
  if (item?.type === 'text') {
    return String(item.text ?? item.content ?? '');
  }
  return String(item?.text ?? item?.content ?? '');
});

const { html: markdownContent, ready: markdownReady } = useMarkdownHtml(textContent);
</script>

<template>
  <div
    v-if="markdownReady && markdownContent"
    class="tr-bubble__markdown markdown-content markdown-body"
    data-type="markdown"
    v-html="markdownContent"
  />
  <span v-else-if="textContent" class="tr-bubble__body-text">{{ textContent }}</span>
</template>

<style scoped lang="less">
.tr-bubble__markdown {
  font-size: var(--tr-bubble-text-font-size);
  line-height: var(--tr-bubble-text-line-height);
  color: var(--tr-bubble-text-color);
}

.tr-bubble__body-text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
