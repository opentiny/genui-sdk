<template>
  <GenuiChat
    :url="url"
    :customizeSetting="customizeSetting"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import MessageFooter from './components/MessageFooter.vue';

const url = 'https://your-chat-backend/api';

const customizeSetting = {
  footerComponent: {
    user: MessageFooter,
    assistant: MessageFooter
  }
};
</script>

