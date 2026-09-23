<script setup lang="ts">
import type { ComposerSegment } from './schema-composer';

defineProps<{
  segments?: ComposerSegment[];
  content?: string;
}>();
</script>

<template>
  <div class="template-user-message">
    <p v-if="segments?.length" class="template-user-message__text">
      <template v-for="(seg, index) in segments" :key="index">
        <span v-if="seg.type === 'text'">{{ seg.value }}</span>
        <span v-else class="template-user-message__tag">{{ seg.tag.componentName }}</span>
      </template>
    </p>
    <p v-else-if="content" class="template-user-message__text">{{ content }}</p>
  </div>
</template>

<style scoped lang="less">
/* 卡片视觉（padding/背景/圆角/阴影）由外层 tr-bubble__content 提供，这里只负责内容排版 */
.template-user-message {
  &__text {
    margin: 0;
    font-size: 14px;
    line-height: 28px;
    color: var(--tr-text-primary, #191919);
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    margin: 0 2px;
    padding: 0 8px;
    vertical-align: baseline;
    border-radius: 6px;
    background: rgba(24, 144, 255, 0.08);
    border: 1px solid rgba(24, 144, 255, 0.25);
    font-size: 12px;
    line-height: 22px;
    color: #1890ff;
    white-space: nowrap;
  }
}
</style>
