<script setup>
import { defineAsyncComponent } from 'vue';
import PlaygroundViewShell from './PlaygroundViewShell.vue';
import { usePlaygroundViewContext } from './usePlaygroundViewContext';

const GenuiTemplate = defineAsyncComponent(() => import('../components/genui-template/GenuiTemplate.vue'));

const { theme, llmConfig, chatConfig } = usePlaygroundViewContext();
</script>

<template>
  <PlaygroundViewShell>
    <GenuiTemplate :llm-config="llmConfig" :theme="theme" :chat-config="chatConfig" />
  </PlaygroundViewShell>
</template>
