<template>
  <GenuiChat :url="url" :thinkComponent="CustomThinkComponent" :config="genuiConfig" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import CustomThinkComponent from './components/custom-think-component.vue';

const url = 'https://your-chat-backend/api';

const genuiConfig = {
  showThinkingResult: true,
};
</script>
