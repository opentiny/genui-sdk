<script setup lang="ts">
import { computed } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);

const textContent = computed(() => String((content.value as { content?: string })?.content ?? ''));
</script>

<template>
  <span v-if="textContent" class="tr-bubble__body-text">{{ textContent }}</span>
</template>

<style scoped lang="less">
.tr-bubble__body-text {
  white-space: pre-wrap;
  word-break: break-word;
}
</style>
