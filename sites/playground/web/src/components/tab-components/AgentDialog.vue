<script setup lang="ts">
import { computed } from 'vue';
import {
  TinyButton,
  TinyDialogBox,
  TinyForm,
  TinyFormItem,
  TinyInput,
} from '@opentiny/vue';

const props = defineProps<{
  visible: boolean;
  agentData: {
    name: string;
    agentCardUrl: string;
    description?: string;
    index: number;
  };
  agentCard: any;
  agentCardStatus: 'idle' | 'loading' | 'success' | 'error';
  agentCardError: string;
  agentQueryLoading: boolean;
  addAgentLoading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update:agentData', value: typeof props.agentData): void;
  (e: 'queryAgentCard'): void;
  (e: 'confirmAgent'): void;
}>();

const handleClose = () => {
  emit('update:visible', false);
};

const updateField = (field: keyof typeof props.agentData, value: any) => {
  emit('update:agentData', {
    ...props.agentData,
    [field]: value,
  });
};

interface AgentCapabilityViewItem {
  title: string;
  /** Card 为对象且含 description / summary 等时才有 */
  description?: string;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) {
      return v.trim();
    }
  }
  return undefined;
}

/** fallbackTitle：capabilities 为 Record 时传入外层 key，作为无 name/id 时的展示名 */
function normalizeCapabilityEntry(item: unknown, fallbackTitle?: string): AgentCapabilityViewItem {
  if (typeof item === 'string') {
    return { title: item };
  }
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    const o = item as Record<string, unknown>;
    const description = pickString(o, ['description', 'summary', 'doc', 'documentation']);
    const title =
      pickString(o, ['name', 'id', 'title', 'skillId', 'capabilityId', 'type']) ??
      fallbackTitle ??
      (description ? '未命名能力' : JSON.stringify(item));
    return { title, description };
  }
  return { title: String(item) };
}

/** string[] 多为技能 id，通常无单独描述；对象可带 description / summary 等 */
const agentCapabilityItems = computed((): AgentCapabilityViewItem[] => {
  const cap = props.agentCard?.capabilities;
  if (cap == null) {
    return [];
  }
  if (Array.isArray(cap)) {
    return cap.map((item) => normalizeCapabilityEntry(item));
  }
  if (typeof cap === 'object' && !Array.isArray(cap)) {
    return Object.entries(cap as Record<string, unknown>).map(([k, v]) => {
      if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        return normalizeCapabilityEntry(v, k);
      }
      if (typeof v === 'string') {
        return { title: k, description: v };
      }
      return { title: k, description: v === undefined ? undefined : JSON.stringify(v) };
    });
  }
  return [{ title: String(cap) }];
});
</script>

<template>
  <tiny-dialog-box
    :visible="visible"
    :title="agentData.index > -1 ? '编辑 Agent' : '添加 Agent'"
    width="520px"
    :append-to-body="true"
    @update:visible="emit('update:visible', $event)"
    @close="handleClose"
  >
    <tiny-form :model="agentData" label-width="140px" label-position="left" class="agent-dialog-form">
      <tiny-form-item label="Agent Card URL" prop="agentCardUrl" required>
        <div class="agent-url-action-row">
          <tiny-input
            :model-value="agentData.agentCardUrl"
            placeholder="完整的 Agent Card 地址"
            @update:model-value="updateField('agentCardUrl', $event)"
          />
          <tiny-button type="primary" :loading="agentQueryLoading" @click="emit('queryAgentCard')">
            {{ agentCardStatus === 'error' ? '重试' : '查询' }}
          </tiny-button>
        </div>
      </tiny-form-item>
      <tiny-form-item label="名称" prop="name" required>
        <tiny-input
          :model-value="agentData.name"
          placeholder="Agent 名称（用于在界面展示）"
          @update:model-value="updateField('name', $event)"
        />
      </tiny-form-item>
      <tiny-form-item label="描述" prop="description">
        <tiny-input
          type="textarea"
          :model-value="agentData.description"
          placeholder="可选：用于在列表展示"
          @update:model-value="updateField('description', $event)"
        />
      </tiny-form-item>
    </tiny-form>
    <template #footer>
      <tiny-button
        type="primary"
        :loading="addAgentLoading"
        @click="emit('confirmAgent')"
        v-if="agentCardStatus === 'success'"
      >
        确认
      </tiny-button>
    </template>
    <div v-if="agentCardStatus === 'loading'" class="agent-card-hint agent-card-hint--info">
      正在查询 Agent Card...
    </div>
    <div v-if="agentCardStatus === 'error'" class="agent-card-hint agent-card-hint--error">
      {{ agentCardError }}
    </div>
    <div v-if="agentCardStatus === 'success' && agentCard" class="agent-card-detail">
      <div class="agent-card-detail__badge">AgentCard 已解析</div>
      <div class="agent-card-detail__main">
        <h4 class="agent-card-detail__title">{{ agentCard.name || '未命名 Agent' }}</h4>
        <p v-if="agentCard.description" class="agent-card-detail__desc">{{ agentCard.description }}</p>
        <div class="agent-card-detail__block">
          <span class="agent-card-detail__block-label">API URL</span>
          <div class="agent-card-detail__url" :class="{ 'is-missing': !agentCard.api?.url }">
            {{ agentCard.api?.url || '缺少 api.url，服务端无法作为工具调用' }}
          </div>
        </div>
        <div class="agent-card-detail__block agent-card-detail__capabilities">
          <span class="agent-card-detail__block-label">Capabilities</span>
          <ul v-if="agentCapabilityItems.length" class="agent-card-detail__cap-list">
            <li v-for="(item, i) in agentCapabilityItems" :key="i" class="agent-card-detail__cap-item">
              <div class="agent-card-detail__cap-title">{{ item.title }}</div>
              <div v-if="item.description" class="agent-card-detail__cap-desc">{{ item.description }}</div>
            </li>
          </ul>
          <div v-else class="agent-card-detail__cap-empty">未声明或为空</div>
        </div>
        <div
          v-if="agentCard.auth?.type && String(agentCard.auth.type).toLowerCase() !== 'none'"
          class="agent-card-detail__auth"
        >
          <span class="agent-card-detail__block-label">认证</span>
          <span class="agent-card-detail__auth-text">
            {{ agentCard.auth.type }} · 工具调用时请在 metadata 中传入 token 或 apiKey
          </span>
        </div>
      </div>
    </div>
  </tiny-dialog-box>
</template>

<style scoped lang="less">
.agent-dialog-form {
  :deep(.tiny-form-item__label) {
    line-height: 1.35;
    white-space: normal;
    word-break: break-word;
  }
}

.agent-url-action-row {
  display: flex;
  align-items: center;
  gap: 8px;

  :deep(.tiny-input) {
    flex: 1;
  }
}

.agent-card-detail {
  position: relative;
  margin-top: 16px;
  padding: 0;
  border-radius: 10px;
  border: 1px solid #e8e8e8;
  background: linear-gradient(180deg, #fcfcfd 0%, #f7f8fa 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.04);
  overflow: hidden;

  &__badge {
    display: inline-block;
    margin: 12px 14px 0;
    padding: 2px 8px;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.02em;
    color: #1476ff;
    background: rgba(20, 118, 255, 0.08);
    border-radius: 4px;
  }

  &__main {
    padding: 10px 14px 14px;
  }

  &__title {
    margin: 0 0 6px;
    font-size: 15px;
    font-weight: 600;
    color: #1f1f1f;
    line-height: 1.35;
  }

  &__desc {
    margin: 0 0 12px;
    font-size: 12px;
    line-height: 1.55;
    color: #595959;
  }

  &__block {
    margin-bottom: 10px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__block-label {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #8c8c8c;
  }

  &__url {
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    word-break: break-all;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
    color: #262626;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 6px;

    &.is-missing {
      color: #cf1322;
      border-color: #ffccc7;
      background: #fff2f0;
      font-family: inherit;
    }
  }

  &__auth {
    padding-top: 4px;
  }

  &__auth-text {
    display: block;
    font-size: 12px;
    line-height: 1.5;
    color: #595959;
  }

  &__cap-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__cap-item {
    padding: 8px 10px;
    margin-bottom: 6px;
    font-size: 12px;
    line-height: 1.45;
    word-break: break-word;
    color: #262626;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 6px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  &__cap-title {
    font-weight: 600;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  }

  &__cap-desc {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.5;
    color: #595959;
    font-family: inherit;
    white-space: pre-wrap;
  }

  &__cap-empty {
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: #8c8c8c;
    background: #fafafa;
    border: 1px dashed #e0e0e0;
    border-radius: 6px;
  }
}

.agent-card-hint {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;

  &--info {
    background-color: #e6f4ff;
    color: #0958d9;
    border: 1px solid #91caff;
  }

  &--error {
    background-color: #fff1f0;
    color: #cf1322;
    border: 1px solid #ffa39e;
    max-height: 200px;
    overflow-y: auto;
    white-space: pre-wrap;
  }
}
</style>

