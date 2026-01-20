<script setup lang="ts">
import { ThemeProvider, type BubbleProps } from '@opentiny/tiny-robot';
import GenuiChat from './GenuiChat.vue';
import { ref, inject, computed } from 'vue';
import type { IChatProps, IProviderProps } from './chat.types';

const props = withDefaults(defineProps<IChatProps>(), {
  messages: () => [],
  config: () => ({ addToolCallContext: false, showThinkingResult: false }),
  customComponents: () => [],
  customSnippets: () => [],
  customExamples: () => [],
  customActions: () => [],
});

const TinyGenuiConfig: any = inject('TinyGenuiConfig');

const providerProps = computed(() => {
  const props: IProviderProps = {};
  if (TinyGenuiConfig?.value?.id) {
    props.targetElement = '#' + TinyGenuiConfig.value.id;
  }
  return props;
});

const chat = ref<InstanceType<typeof GenuiChat> | null>(null);
defineExpose({
  handleNewConversation: () => chat.value?.handleNewConversation(),
  getConversation: () => chat.value?.getConversation(),
});
</script>
<template>
  <ThemeProvider v-bind="providerProps">
    <GenuiChat ref="chat" v-bind="props">
      <template #empty>
        <slot name="empty"></slot>
      </template>
    </GenuiChat>
  </ThemeProvider>
</template>
