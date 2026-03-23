<script setup lang="ts">
import { computed } from 'vue';
import { TinyPopover, TinyButton } from '@opentiny/vue';
import { iconInfoCircle } from '@opentiny/vue-icon';

const InfoIcon = iconInfoCircle();


export interface ChatCompletionFinishChunk {
  object?: string;
  model?: string;
  created?: number;
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
  data: ChatCompletionFinishChunk | null | undefined;
}>();

const usage = computed(() => props.data?.usage);

const finishReason = computed(() => props.data?.choices?.[0]?.finish_reason ?? undefined);

const createdLabel = computed(() => {
  const t = props.data?.created;
  if (t == null) return '';
  const ms = t < 1e12 ? t * 1000 : t;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? String(t) : d.toLocaleString();
});

function formatInt(n: number) {
  return n.toLocaleString();
}
</script>

<template>
  <tiny-popover
    v-if="data"
    trigger="hover"
    placement="bottom-start"
    width="auto"
    :visible-arrow="false"
    popper-class="finish-statistic-popover"
  >
    <template #default>
      <div class="finish-statistic-panel">
        <div class="panel-title">对话信息</div>
        <dl class="stat-list">
          <div v-if="data.model" class="stat-row">
            <dt>模型</dt>
            <dd>{{ data.model }}</dd>
          </div>
          <div v-if="finishReason != null && finishReason !== ''" class="stat-row">
            <dt>结束原因</dt>
            <dd>{{ finishReason }}</dd>
          </div>
          <div v-if="data.created != null" class="stat-row">
            <dt>时间</dt>
            <dd>{{ createdLabel }}</dd>
          </div>
          <template v-if="usage">
            <div v-if="usage.prompt_tokens != null" class="stat-row">
              <dt>输入 Token</dt>
              <dd>{{ formatInt(usage.prompt_tokens) }}</dd>
            </div>
            <div v-if="usage.completion_tokens != null" class="stat-row">
              <dt>输出 Token</dt>
              <dd>{{ formatInt(usage.completion_tokens) }}</dd>
            </div>
            <div v-if="usage.total_tokens != null" class="stat-row stat-row--emphasis">
              <dt>总计 Token</dt>
              <dd>{{ formatInt(usage.total_tokens) }}</dd>
            </div>
          </template>
        </dl>
      </div>
    </template>
    <template #reference>
      <tiny-button
        aria-label="本轮对话统计信息"
        type="text"
        :icon="InfoIcon"
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
  color: #1a1a1a;
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
  color: #333;
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
