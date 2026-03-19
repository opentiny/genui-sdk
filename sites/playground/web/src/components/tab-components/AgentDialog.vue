<script setup lang="ts">
import {
  TinyButton,
  TinyDialogBox,
  TinyForm,
  TinyFormItem,
  TinyInput,
  TinySwitch,
} from '@opentiny/vue';

const props = defineProps<{
  visible: boolean;
  agentData: {
    name: string;
    agentCardUrl: string;
    description?: string;
    enabled?: boolean;
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
</script>

<template>
  <tiny-dialog-box
    :visible="visible"
    :title="agentData.index > -1 ? '编辑 Agent' : '添加 Agent'"
    width="500px"
    @update:visible="emit('update:visible', $event)"
    @close="handleClose"
  >
    <tiny-form :model="agentData" label-width="120px" label-position="left">
      <tiny-form-item label="名称" prop="name" required>
        <tiny-input
          :model-value="agentData.name"
          placeholder="Agent 名称（用于在界面展示）"
          @update:model-value="updateField('name', $event)"
        />
      </tiny-form-item>
      <tiny-form-item label="Agent Card URL" prop="agentCardUrl" required>
        <div class="agent-url-action-row">
          <tiny-input
            :model-value="agentData.agentCardUrl"
            placeholder="完整的 Agent Card 地址，例如 http://localhost:3100/a2a/agent"
            @update:model-value="updateField('agentCardUrl', $event)"
          />
          <tiny-button type="primary" :loading="agentQueryLoading" @click="emit('queryAgentCard')">
            {{ agentCardStatus === 'error' ? '重试' : '查询' }}
          </tiny-button>
        </div>
      </tiny-form-item>
      <tiny-form-item label="描述" prop="description">
        <tiny-input
          type="textarea"
          :model-value="agentData.description"
          placeholder="可选：用于在列表展示"
          @update:model-value="updateField('description', $event)"
        />
      </tiny-form-item>
      <tiny-form-item label="启用" prop="enabled">
        <tiny-switch
          :model-value="agentData.enabled"
          @update:model-value="updateField('enabled', $event)"
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
      <div class="agent-card-detail__header">
        <div class="agent-card-detail__title">
          {{ agentCard.name || '未命名 Agent' }}
        </div>
        <div class="agent-card-detail__subtitle">
          {{ agentCard.description || '无描述' }}
        </div>
      </div>
      <div class="agent-card-detail__section">
        <div class="agent-card-detail__section-title">基础信息</div>
        <div class="agent-card-detail__row">
          <span class="agent-card-detail__label">版本</span>
          <span class="agent-card-detail__value">{{ agentCard.version || '-' }}</span>
        </div>
      </div>
      <div class="agent-card-detail__section">
        <div class="agent-card-detail__section-title">API</div>
        <div class="agent-card-detail__row">
          <span class="agent-card-detail__label">类型</span>
          <span class="agent-card-detail__value">{{ (agentCard.api && agentCard.api.type) || '-' }}</span>
        </div>
        <div class="agent-card-detail__row">
          <span class="agent-card-detail__label">URL</span>
          <span class="agent-card-detail__value">{{ (agentCard.api && agentCard.api.url) || '-' }}</span>
        </div>
        <div class="agent-card-detail__row">
          <span class="agent-card-detail__label">版本</span>
          <span class="agent-card-detail__value">{{ (agentCard.api && agentCard.api.version) || '-' }}</span>
        </div>
      </div>
      <div class="agent-card-detail__section">
        <div class="agent-card-detail__section-title">认证</div>
        <div class="agent-card-detail__row">
          <span class="agent-card-detail__label">类型</span>
          <span class="agent-card-detail__value">{{ (agentCard.auth && agentCard.auth.type) || 'none' }}</span>
        </div>
      </div>
      <div class="agent-card-detail__section">
        <div class="agent-card-detail__section-title">能力</div>
        <div class="agent-card-detail__row">
          <span class="agent-card-detail__label">capabilities</span>
          <span class="agent-card-detail__value">
            {{
              Array.isArray(agentCard.capabilities)
                ? agentCard.capabilities.join(', ')
                : agentCard.capabilities || '-'
            }}
          </span>
        </div>
      </div>
    </div>
  </tiny-dialog-box>
</template>

<style scoped lang="less">
.agent-url-action-row {
  display: flex;
  align-items: center;
  gap: 8px;

  :deep(.tiny-input) {
    flex: 1;
  }
}

.agent-card-detail {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 8px;
  background-color: #fafafa;
  border: 1px solid #f0f0f0;
  max-height: 260px;
  overflow: auto;
  font-size: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);

  &__header {
    margin-bottom: 8px;
  }

  &__title {
    font-size: 13px;
    font-weight: 600;
    color: #262626;
    margin-bottom: 2px;
  }

  &__subtitle {
    font-size: 12px;
    color: #8c8c8c;
  }

  &__section {
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #f5f5f5;
  }

  &__section-title {
    font-size: 12px;
    font-weight: 600;
    color: #595959;
    margin-bottom: 4px;
  }

  &__row {
    display: flex;
    margin-bottom: 2px;
  }

  &__label {
    flex: 0 0 70px;
    color: #8c8c8c;
  }

  &__value {
    flex: 1;
    color: #333;
    word-break: break-all;
  }
}

.agent-card-hint {
  margin-top: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.5;

  &--info {
    background-color: #e6f4ff;
    color: #0958d9;
    border: 1px solid #91caff;
  }

  &--error {
    background-color: #fff1f0;
    color: #cf1322;
    border: 1px solid #ffa39e;
  }
}
</style>

