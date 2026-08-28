<script setup lang="ts">
import type { IChatMessage } from '@opentiny/genui-sdk-core';
import { computed } from 'vue';
import { TinyPopover, TinyButton } from '@opentiny/vue';
import { iconInfoCircle } from '@opentiny/vue-icon';
import { vFocusHoverSync } from './v-focus-hover-sync';
import { t } from '../i18n';

const InfoIcon = iconInfoCircle();

export interface ChatCompletionFinishChunk {
  object?: string;
  model?: string;
  created?: number;
  durationMs?: number;
  /** 发送请求 → AI 开始回复（首响应）耗时 ms */
  ttfb?: number;
  /** AI 开始回复 → UI 流式渲染完毕耗时 ms */
  renderDurationMs?: number;
  choices?: Array<{
    index?: number;
    delta?: Record<string, unknown>;
    finish_reason?: string | null;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

const props = defineProps<{
  chatMessage: IChatMessage;
}>();

const finishChunk = computed(
  () => props.chatMessage.finishInfo as ChatCompletionFinishChunk | null | undefined,
);

const usage = computed(() => finishChunk.value?.usage);

const finishReason = computed(() => finishChunk.value?.choices?.[0]?.finish_reason ?? undefined);

const createdLabel = computed(() => {
  const t = finishChunk.value?.created;
  if (t == null) return '';
  const ms = t < 1e12 ? t * 1000 : t;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? String(t) : d.toLocaleString();
});

function formatDuration(ms?: number) {
  if (ms == null) return '';
  const seconds = ms / 1000;
  return `${Math.round(seconds * 100) / 100}s`;
}

const ttfbLabel = computed(() => formatDuration(finishChunk.value?.ttfb));

const renderDurationLabel = computed(() => formatDuration(finishChunk.value?.renderDurationMs));

const durationLabel = computed(() => {
  const ttfb = finishChunk.value?.ttfb;
  const renderDurationMs = finishChunk.value?.renderDurationMs;
  if (ttfb == null || renderDurationMs == null) return '';
  return formatDuration(ttfb + renderDurationMs);
});

function formatInt(n: number) {
  return n.toLocaleString();
}

const titleContent = computed(() => {
  if (props.chatMessage['originChatMessage'] !== undefined) {
    return t('finishInfo.titleMultiGen');
  }
  return t('finishInfo.title');
});
</script>

<template>
  <tiny-popover
    v-if="finishChunk"
    trigger="hover"
    placement="bottom-start"
    width="auto"
    :visible-arrow="false"
    popper-class="finish-statistic-popover tiny-genui-playground-popover"
  >
    <template #default>
      <div class="finish-statistic-panel">
        <div class="panel-title">{{ titleContent }}</div>
        <dl class="stat-list">
          <div v-if="finishChunk.model" class="stat-row">
            <dt>{{ t('finishInfo.model') }}</dt>
            <dd>{{ finishChunk.model }}</dd>
          </div>
          <div v-if="finishReason != null && finishReason !== ''" class="stat-row">
            <dt>{{ t('finishInfo.finishReason') }}</dt>
            <dd>{{ finishReason }}</dd>
          </div>
          <div v-if="finishChunk.created != null" class="stat-row">
            <dt>{{ t('finishInfo.time') }}</dt>
            <dd>{{ createdLabel }}</dd>
          </div>
          <div v-if="durationLabel" class="stat-row stat-row--emphasis">
            <dt>{{ t('finishInfo.duration') }}</dt>
            <dd>{{ durationLabel }}</dd>
          </div>
          <div v-if="ttfbLabel" class="stat-row">
            <dt>{{ t('finishInfo.ttfb') }}</dt>
            <dd>{{ ttfbLabel }}</dd>
          </div>
          <div v-if="renderDurationLabel" class="stat-row">
            <dt>{{ t('finishInfo.renderDuration') }}</dt>
            <dd>{{ renderDurationLabel }}</dd>
          </div>
          <template v-if="usage">
            <div v-if="usage.prompt_tokens != null" class="stat-row">
              <dt>{{ t('finishInfo.promptTokens') }}</dt>
              <dd>{{ formatInt(usage.prompt_tokens) }}</dd>
            </div>
            <div v-if="usage.completion_tokens != null" class="stat-row">
              <dt>{{ t('finishInfo.completionTokens') }}</dt>
              <dd>{{ formatInt(usage.completion_tokens) }}</dd>
            </div>
            <div v-if="usage.total_tokens != null" class="stat-row stat-row--emphasis">
              <dt>{{ t('finishInfo.totalTokens') }}</dt>
              <dd>{{ formatInt(usage.total_tokens) }}</dd>
            </div>
          </template>
        </dl>
      </div>
    </template>
    <template #reference>
      <tiny-button
        :reset-time="0"
        :aria-label="t('finishInfo.ariaLabel')"
        type="text"
        :icon="InfoIcon"
        v-focus-hover-sync
      >
      </tiny-button>
    </template>
  </tiny-popover>
</template>

<style scoped>
.finish-statistic-trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: #666;
  cursor: pointer;
  border-radius: 6px;
  font-size: 12px;
  transition: background-color 0.2s, color 0.2s;
}

.finish-statistic-trigger:hover {
  background-color: #f5f5f5;
  color: #333;
}

.finish-statistic-trigger-icon {
  flex-shrink: 0;
}

.finish-statistic-panel {
  min-width: 220px;
  padding: 2px 0;
}

.panel-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--tv-color-text);
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eee;
}

.stat-list {
  margin: 0;
}

.stat-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin: 0;
  padding: 6px 0;
  font-size: 12px;
  line-height: 1.4;
}

.stat-row dt {
  margin: 0;
  color: #888;
  font-weight: normal;
  flex-shrink: 0;
}

.stat-row dd {
  margin: 0;
  color: var(--tv-color-text);
  text-align: right;
  word-break: break-all;
}

.stat-row--emphasis dd {
  font-weight: 600;
  color: #1890ff;
}
</style>

<style>
.finish-statistic-popover.tiny-popover.tiny-popper {
  padding: 12px 14px;
}
</style>
