<script setup lang="ts">
import type { ComposerSegment } from './schema-composer';

defineProps<{
  segments?: ComposerSegment[];
  content?: string;
  selectedNodes?: { id: string; componentName: string }[];
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
    <template v-else>
      <p v-if="content" class="template-user-message__text">{{ content }}</p>
      <div v-if="selectedNodes?.length" class="template-user-message__legacy-tags">
        <span v-for="node in selectedNodes" :key="node.id" class="template-user-message__tag">
          {{ node.componentName }}
        </span>
      </div>
    </template>
  </div>
</template>

<style scoped lang="less">
.template-user-message {
  padding: 10px 14px;
  border-radius: 12px;
  background: var(--tr-bubble-content-bg, #fff);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  box-sizing: border-box;

  &__text {
    margin: 0;
    font-size: 14px;
    line-height: 28px;
    color: var(--tr-text-primary, #191919);
    white-space: pre-wrap;
    word-break: break-word;
  }

  &__legacy-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 8px;
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
