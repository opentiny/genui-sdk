<script setup lang="ts">
import PreviewTag from './PreviewTag.vue';
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
        <PreviewTag
          v-else
          :title="seg.value.componentName"
          class="template-user-message__tag"
        >
          {{ seg.value.componentName }}
          <template #preview>
            <div class="template-user-message__preview">
              <div class="template-user-message__preview-name">{{ seg.value.componentName }}</div>
              <div class="template-user-message__preview-meta">id: {{ seg.value.id }}</div>
            </div>
          </template>
          <template #fullscreen>
            <div class="template-user-message__fullscreen">
              <div class="template-user-message__fullscreen-title">选中组件</div>
              <div class="template-user-message__fullscreen-item">
                <span class="template-user-message__fullscreen-label">组件名</span>
                <span>{{ seg.value.componentName }}</span>
              </div>
              <div class="template-user-message__fullscreen-item">
                <span class="template-user-message__fullscreen-label">id</span>
                <span>{{ seg.value.id }}</span>
              </div>
            </div>
          </template>
        </PreviewTag>
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

  /* hover 预览（PreviewTag 浮层内的最小组件信息） */
  &__preview {
    display: flex;
    flex-direction: column;
    gap: 4px;

    &-name {
      font-size: 13px;
      font-weight: 500;
      color: #191919;
    }

    &-meta {
      font-size: 12px;
      color: #8a8a8a;
    }
  }

  /* 全屏查看（PreviewTag overlay 内的组件信息） */
  &__fullscreen {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 260px;

    &-title {
      font-size: 15px;
      font-weight: 600;
      color: #191919;
      margin-bottom: 4px;
    }

    &-item {
      display: flex;
      gap: 12px;
      align-items: baseline;
      font-size: 13px;
      color: #333;
    }

    &-label {
      flex-shrink: 0;
      min-width: 48px;
      color: #8a8a8a;
    }
  }
}
</style>
