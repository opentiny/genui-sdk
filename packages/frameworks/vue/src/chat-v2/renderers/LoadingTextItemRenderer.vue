<script setup lang="ts">
import { computed } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import GeneratingComponent from '../../chat/GeneratingComponent.vue';
import type { IMessage } from '../../chat/chat.types';
import type { INotificationEventEmitter } from '../../chat/chat.types';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);

const thinkProps = computed(() => {
  const item = content.value as {
    emitter?: INotificationEventEmitter;
    message?: IMessage;
    showThinkingResult?: boolean;
  };
  return {
    emitter: item.emitter!,
    message: item.message!,
    showThinkingResult: item.showThinkingResult ?? false,
  };
});
</script>

<template>
  <div v-if="thinkProps.emitter && thinkProps.message" data-type="loading-text">
    <GeneratingComponent v-bind="thinkProps" />
  </div>
</template>
