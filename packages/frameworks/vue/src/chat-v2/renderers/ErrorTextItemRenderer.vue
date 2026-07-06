<script setup lang="ts">
import { computed } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import ErrorText from '../../chat/ErrorText.vue';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);

const errorContent = computed(() => String((content.value as { content?: string })?.content ?? ''));
</script>

<template>
  <ErrorText :content="errorContent" />
</template>
