<template>
  <GenuiChat
    :url="url"
    :thinkComponent="CustomThinkComponent"
    :config="genuiConfig"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import CustomThinkComponent from './components/CustomThinkComponent.vue';

const url = 'https://your-chat-backend/api';

const genuiConfig = {
  showThinkingResult: true,
  addToolCallContext: true
};
</script>

