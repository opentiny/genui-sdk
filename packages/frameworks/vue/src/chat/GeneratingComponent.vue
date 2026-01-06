<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { INotificationPayload } from '@opentiny/genui-sdk-core';
import type { IGeneratingComponentProps } from './chat.types';
import { useI18n } from './i18n'; //TODO: replace with package name

const props = defineProps<IGeneratingComponentProps>();

const { t } = useI18n();

const loadingText = ref(t('loading.response'));

const toolStatusTextMap = new Map<string, { textKey: string }>([
  ['running', { textKey: 'toolStatus.running' }],
  ['success', { textKey: 'toolStatus.success' }],
  ['failed', { textKey: 'toolStatus.failed' }],
  ['cancelled', { textKey: 'toolStatus.cancelled' }],
]);

const handleNotification = (payload: INotificationPayload) => {
  if (payload.type === 'done') {
    loadingText.value = '';
    return;
  }

  if (payload.type === 'schema-card') {
    loadingText.value = t('loading.generatingCard');
    return;
  }

  if (props.showThinkingResult) {
    loadingText.value = t('loading.response');
    return;
  }

  if (payload.type === 'tool') {
    const { toolCallData } = payload;
    const textKey = toolStatusTextMap.get(toolCallData.status)?.textKey || 'loading.response';
    loadingText.value = `${t(textKey)} ${toolCallData.name}...`;
    return;
  }

  // type === 'markdown'
  const lastMessage = payload.chatMessage.messages[payload.chatMessage.messages.length - 1];
  if (lastMessage) {
    loadingText.value = `${lastMessage.content}...`;
  }
};

onMounted(() => {
  props.emitter.on('notification', handleNotification);
});

onBeforeUnmount(() => {
  props.emitter.off('notification', handleNotification);
});
</script>

<template>
  <div v-if="loadingText" class="loading-container" type="loading-text">{{ loadingText }}</div>
</template>
<style scoped lang="less">
.loading-container[type='loading-text'] {
  margin: 10px 0;
  background: linear-gradient(90deg, #666 0%, #666 45%, #999 50%, #999 55%, #666 60%, #666 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: text-shimmer 6s linear infinite;
}
</style>
