<script setup lang="ts">
import { computed } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import ToolRenderer from './ToolRenderer.vue';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);

const toolProps = computed(() => {
  const item = content.value as {
    name?: string;
    status?: 'running' | 'success' | 'failed' | 'cancelled';
    content?: string | Record<string, unknown>;
    formatPretty?: boolean;
    defaultOpen?: boolean;
  };
  return {
    name: item.name ?? '',
    status: item.status ?? 'running',
    content: item.content,
    formatPretty: item.formatPretty,
    defaultOpen: item.defaultOpen,
  };
});
</script>

<template>
  <div v-if="toolProps.name" class="tool-item" data-type="tool">
    <ToolRenderer v-bind="toolProps" />
  </div>
</template>
