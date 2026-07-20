<script setup lang="ts">
import { computed } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import ErrorText from '../ErrorText.vue';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);

const errorContent = computed(() => String((content.value as { content?: string })?.content ?? ''));
</script>

<template>
  <div data-type="error-text">
    <ErrorText :content="errorContent" />
  </div>
</template>
