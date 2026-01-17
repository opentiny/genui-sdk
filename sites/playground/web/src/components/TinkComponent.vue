<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { INotificationPayload } from '@opentiny/genui-sdk-core';
import type { IThinkComponentProps } from './common.types';

const props = defineProps<IThinkComponentProps>();

const loadingText = ref('响应中...');

const toolStatusTextMap = new Map<string, { text: string }>([
  ['running', { text: '正在调用' }],
  ['success', { text: '已调用' }],
  ['failed', { text: '调用失败' }],
  ['cancelled', { text: '已取消' }],
]);

const handleNotification = (payload: INotificationPayload) => {
  // console.log('------------------handleNotification----------------------', payload);
  if (payload.type === 'done') {
    loadingText.value = '';
    return;
  }

  if (payload.type === 'schema-card') {
    loadingText.value = '正在生成卡片...';
    return;
  }

  if (props.showThinkingResult) {
    loadingText.value = '响应中...';
    return;
  }

  if (payload.type === 'tool') {
    const { toolCallData } = payload;
    loadingText.value = `${toolStatusTextMap.get(toolCallData.status)?.text} ${toolCallData.name}...`;
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
