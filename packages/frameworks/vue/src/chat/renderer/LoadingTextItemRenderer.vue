<script setup lang="ts">
import { computed, type Component } from 'vue';
import type { BubbleContentRendererProps } from '@opentiny/tiny-robot';
import { useMessageContent } from '@opentiny/tiny-robot';
import GeneratingComponent from '../GeneratingComponent.vue';
import type { IMessage } from '../chat.types';
import type { INotificationEventEmitter } from '../chat.types';

const props = defineProps<BubbleContentRendererProps>();
const { content } = useMessageContent(props);

const thinkProps = computed(() => {
  const item = content.value as {
    emitter?: INotificationEventEmitter;
    message?: IMessage;
    showThinkingResult?: boolean;
    thinkComponent?: Component;
  };
  return {
    emitter: item.emitter!,
    message: item.message!,
    showThinkingResult: item.showThinkingResult ?? false,
    component: item.thinkComponent || GeneratingComponent,
  };
});
</script>

<template>
  <div v-if="thinkProps.emitter && thinkProps.message" data-type="loading-text">
    <component
      :is="thinkProps.component"
      :emitter="thinkProps.emitter"
      :message="thinkProps.message"
      :showThinkingResult="thinkProps.showThinkingResult"
    />
  </div>
</template>
