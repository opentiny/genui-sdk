<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { INotificationPayload } from '@opentiny/genui-sdk-core';
import type { IThinkComponentProps } from './chat.types';
import { useI18n } from './i18n';

const props = defineProps<IThinkComponentProps>();

const { t } = useI18n();

const loadingText = ref(t('loading.response'));

const hasSchemaCard = ref(false);

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
    if (!hasSchemaCard.value) {
      hasSchemaCard.value = payload.chatMessage.messages?.some((item: any) => item.type.startsWith('schema-card'));
    }
    loadingText.value = hasSchemaCard.value ? `${lastMessage.content}...` : t('loading.response');
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
  <div v-if="loadingText" class="loading-wrapper">
    <div class="loading-container" type="loading-text">{{ loadingText }}</div>
  </div>
</template>
<style scoped lang="less">
.loading-wrapper {
  max-width: 100%;
  overflow: hidden;
  width: 100%;
  min-height: 45px;
}
.loading-container[type='loading-text'] {
  margin: 10px 0;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
  max-width: 100%;
}

@supports ((background-clip: text)) {
  .loading-container[type='loading-text'] {
    background: linear-gradient(90deg, #666 0%, #666 45%, #999 50%, #999 55%, #666 60%, #666 100%);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: text-shimmer 6s linear infinite;
  }
}

@keyframes text-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
