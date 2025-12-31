<script setup lang="ts">
import { ref } from 'vue';
import { iconChevronRight, iconOperationfaild } from '@opentiny/vue-icon';
import { useI18n } from '../i18n';

const IconRight = iconChevronRight();
const IconError = iconOperationfaild();

const props = defineProps<{
  content: string;
}>();

const { t } = useI18n();

const expanded = ref(false);

const toggleExpand = () => {
  expanded.value = !expanded.value;
};
</script>

<template>
  <div class="tg-playground-error-card">
    <div class="card-header" @click="toggleExpand">
      <IconError class="icon-error" />
      <span class="card-title">{{ t('error.title') }}</span>
      <IconRight class="icon-right" :class="{ expanded }" />
    </div>

    <pre class="card-body" :class="{ collapsed: !expanded }">
      {{ content }}
    </pre>
  </div>
</template>

<style scoped lang="less">
.tg-playground-error-card {
  margin: 8px 0;
  padding: 16px 24px;
  border-radius: 24px;
  background-color: var(--tv-color-error-bg-light);
  font-family: SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: var(--tr-bubble-text-font-size);
  line-height: var(--tr-bubble-text-line-height);
  overflow: hidden;
  color: var(--tr-text-primary);
}

.card-header {
  display: flex;
  position: relative;
  align-items: center;
  // color: var(--tv-base-color-error-5);
  font-weight: 500;
  gap: 8px;
}

.icon-error {
  width: 18px;
  height: 18px;
  fill: var(--tv-color-error-icon);
  transform: translateY(-1px);
}

.icon-right {
  width: 16px;
  height: 16px;
  position: absolute;
  fill: var(--tr-text-primary);;
  right: 0;
  top: 50%;
  transform: translateY(-50%) rotate(0deg);
  cursor: pointer;
  transition: transform 0.2s ease-out;
}

.icon-right.expanded {
  transform: translateY(-50%) rotate(90deg);
}

.card-title {
  white-space: nowrap;
}

.card-body {
  margin: 0;
  margin-top: 8px;
  background-color: var(--tr-bubble-content-bg);
  padding: 8px 10px;
  border-radius: 6px;
  max-height: 60vh;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.card-body.collapsed {
  height: 0;
  padding: 0;
  margin-top: 0;
  overflow: hidden;
}
</style>
