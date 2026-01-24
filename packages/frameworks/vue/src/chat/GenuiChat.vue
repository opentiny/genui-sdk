<script setup lang="ts">
import { ThemeProvider, type BubbleProps } from '@opentiny/tiny-robot';
import GenuiChat from './GenuiChatMain.vue';
import { ref, inject, computed } from 'vue';
import type { IChatProps, IProviderProps } from './chat.types';
import { GENUI_CONFIG } from './injection-tokens';

const props = withDefaults(defineProps<IChatProps>(), {
  messages: () => [],
  config: () => ({ addToolCallContext: false, showThinkingResult: false }),
  customComponents: () => [],
  customSnippets: () => [],
  customExamples: () => [],
  customActions: () => [],
});

const genuiConfig: any = inject(GENUI_CONFIG, null);

const providerProps = computed(() => {
  const props: IProviderProps = {};
  if (genuiConfig?.value?.id) {
    props.targetElement = '#' + genuiConfig.value.id;
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
