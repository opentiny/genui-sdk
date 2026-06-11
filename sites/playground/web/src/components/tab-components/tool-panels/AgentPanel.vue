<script setup>
import { ref, inject } from 'vue';
import { TinyButton, TinySwitch, TinyPopover, TinyCollapseItem, TinyNotify } from '@opentiny/vue';
import { iconDel, iconEdit, iconPlus, iconEllipsis } from '@opentiny/vue-icon';
import AgentDialog from './AgentDialog.vue';
import { t } from '../../../i18n';

const playgroundContext = inject('playgroundContext');
const { llmConfig = {} } = playgroundContext || {};

const IconPlus = iconPlus();
const IconDel = iconDel();
const IconEdit = iconEdit();
const IconEllipsis = iconEllipsis();

const showAgentFormDialog = ref(false);
const addAgentLoading = ref(false);
const agentQueryLoading = ref(false);
const agentCard = ref(null);
const agentCardStatus = ref('idle'); // idle | loading | success | error
const agentCardError = ref('');
const lastQueriedAgentCardUrl = ref('');

const agentData = ref({
  name: '',
  agentCardUrl: '',
  description: '',
  index: -1,
});

function truncateRaw(text, maxLen = 2000) {
  const t = String(text ?? '');
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

function formatAgentCardErrorBody(rawText) {
  const trimmed = String(rawText ?? '').trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'error' in parsed) {
      const errVal = parsed.error;
      if (errVal != null && errVal !== '') {
        return truncateRaw(typeof errVal === 'object' ? JSON.stringify(errVal) : String(errVal));
      }
    }
  } catch {
    /* 非 JSON，走下方原文 */
  }
  return truncateRaw(trimmed);
}

const openAgentDialog = () => {
  showAgentFormDialog.value = true;
};

const invalidateAgentCardForUrlChange = () => {
  agentCard.value = null;
  agentCardStatus.value = 'idle';
  agentCardError.value = '';
  lastQueriedAgentCardUrl.value = '';
};

const closeAgentDialog = () => {
  showAgentFormDialog.value = false;
  agentData.value = {
    name: '',
    agentCardUrl: '',
    description: '',
    index: -1,
  };
  agentCard.value = null;
  agentCardStatus.value = 'idle';
  agentCardError.value = '';
  agentQueryLoading.value = false;
  lastQueriedAgentCardUrl.value = '';
};

const addAgent = () => {
  closeAgentDialog();
  openAgentDialog();
};

const editAgent = (agent, index) => {
  agentData.value = {
    name: agent.name || '',
    agentCardUrl: agent.agentCardUrl || '',
    description: agent.description || '',
    index,
  };
  agentCard.value = agent;
  agentCardStatus.value = agent ? 'success' : 'idle';
  agentCardError.value = '';
  agentQueryLoading.value = false;
  lastQueriedAgentCardUrl.value = (agent?.agentCardUrl || '').trim();
  openAgentDialog();
};

const onUpdateAgentData = (val) => {
  agentData.value = val;
  const url = (val.agentCardUrl || '').trim();
  if (lastQueriedAgentCardUrl.value !== '' && url !== lastQueriedAgentCardUrl.value) {
    invalidateAgentCardForUrlChange();
  }
};

const deleteAgent = (agent) => {
  const agents = llmConfig.agents || [];
  llmConfig.agents = agents.filter((a) => a.name !== agent.name);
};

const queryAgentCard = async () => {
  const requestedUrl = (agentData.value.agentCardUrl || '').trim();

  if (!requestedUrl) {
    TinyNotify({
      type: 'warning',
      message: t('agent.cardUrlRequired'),
      position: 'top-right',
    });
    return;
  }

  agentQueryLoading.value = true;
  agentCardStatus.value = 'loading';
  agentCardError.value = '';

  try {
    const res = await fetch(requestedUrl);
    const rawText = await res.text();
    if (!res.ok) {
      const body = rawText.trim();
      const statusLine = `${res.status}${res.statusText ? ` ${res.statusText}` : ''}`.trim();
      throw new Error(formatAgentCardErrorBody(body) || truncateRaw(statusLine));
    }
    let card;
    try {
      card = rawText.trim() ? JSON.parse(rawText) : null;
    } catch {
      throw new Error(formatAgentCardErrorBody(rawText) || truncateRaw(rawText));
    }
    if (!card || typeof card !== 'object') {
      throw new Error(formatAgentCardErrorBody(rawText) || truncateRaw(rawText));
    }
    agentCard.value = card;
    agentData.value = {
      ...agentData.value,
      name: card?.name || '',
      description: card?.description || '',
    };
    agentCardStatus.value = 'success';
    lastQueriedAgentCardUrl.value = requestedUrl;
  } catch (error) {
    agentCardStatus.value = 'error';
    agentCardError.value = error?.message
      ? t('agent.fetchFailed', { message: error.message })
      : t('agent.fetchFailedGeneric');
  } finally {
    agentQueryLoading.value = false;
  }
};

const confirmAgent = () => {
  const { name, agentCardUrl, description, index } = agentData.value;
  const urlTrimmed = (agentCardUrl || '').trim();
  const nameTrimmed = (name || '').trim();

  if (!nameTrimmed || !urlTrimmed) {
    TinyNotify({
      type: 'warning',
      message: t('agent.nameAndUrlRequired'),
      position: 'top-right',
    });
    return;
  }

  if (
    !agentCard.value ||
    agentCardStatus.value !== 'success' ||
    urlTrimmed !== lastQueriedAgentCardUrl.value
  ) {
    TinyNotify({
      type: 'warning',
      message: t('agent.queryFirst'),
      position: 'top-right',
    });
    return;
  }

  const card = agentCard.value;
  const apiUrl = (card?.api?.url || '').trim();
  if (!apiUrl) {
    TinyNotify({
      type: 'warning',
      message: t('agent.missingApiUrl'),
      position: 'top-right',
    });
    return;
  }

  const agents = llmConfig.agents || [];
  const nameCollision = agents.some((a, i) => i !== index && (a.name || '').trim() === nameTrimmed);
  if (nameCollision) {
    TinyNotify({
      type: 'warning',
      message: t('agent.duplicateName', { name: nameTrimmed }),
      position: 'top-right',
    });
    return;
  }

  const enabledValue = index > -1 ? (agents[index]?.enabled ?? true) : true;
  const nextAgent = {
    ...card,
    name: nameTrimmed,
    description: (description || '').trim() || card?.description || '',
    agentCardUrl: urlTrimmed,
    enabled: enabledValue,
  };

  if (index > -1) {
    agents[index] = nextAgent;
  } else {
    agents.push(nextAgent);
  }

  llmConfig.agents = agents;
  closeAgentDialog();
};

const updateAgentEnabled = (agent, enabled) => {
  const agents = llmConfig.agents || [];
  llmConfig.agents = agents.map((a) => (a.name === agent.name ? { ...a, enabled } : a));
};
</script>

<template>
  <tiny-collapse-item name="agent" :title="t('agent.title')">
    <template #title-right>
      <tiny-button type="text" :icon="IconPlus" @click.stop="addAgent"> </tiny-button>
    </template>
    <div class="mcp-server-list" v-if="llmConfig.agents && llmConfig.agents.length > 0">
      <div class="mcp-server-item" v-for="(agent, index) in llmConfig.agents || []" :key="agent.name">
        <div class="mcp-server-item-header">
          <div class="mcp-server-item-name">{{ agent.name }}</div>
          <div>
            <tiny-switch :model-value="agent.enabled" @update:model-value="updateAgentEnabled(agent, $event)"
              class="mcp-server-item-enabled"></tiny-switch>
            <tiny-popover trigger="hover" popper-class="mcp-server-item-actions-popover" :visible-arrow="false"
              :append-to-body="false">
              <template #default>
                <div class="mcp-server-item-actions">
                  <div @click="editAgent(agent, index)">
                    <component :is="IconEdit" />
                    <span>{{ t('common.edit') }}</span>
                  </div>
                  <div @click="deleteAgent(agent)">
                    <component :is="IconDel" />
                    <span>{{ t('common.remove') }}</span>
                  </div>
                </div>
              </template>
              <template #reference>
                <tiny-button type="text" :icon="IconEllipsis"> </tiny-button>
              </template>
            </tiny-popover>
          </div>
        </div>
        <div class="mcp-server-item-description" v-if="agent.description">{{ agent.description }}</div>
      </div>
    </div>
    <div v-else class="mcp-server-list-empty">
      <div class="mcp-server-item-empty">
        <div class="mcp-server-item-empty-icon">
          {{ t('common.emptyHintPrefix') }}
          <component :is="IconPlus" class="mcp-server-item-empty-plus-icon" />
          {{ t('agent.add') }}
        </div>
      </div>
    </div>
    <AgentDialog :visible="showAgentFormDialog" :agent-data="agentData" :agent-card="agentCard"
      :agent-card-status="agentCardStatus" :agent-card-error="agentCardError" :agent-query-loading="agentQueryLoading"
      :add-agent-loading="addAgentLoading"
      @update:visible="(val) => { if (!val) closeAgentDialog(); else showAgentFormDialog = val; }"
      @update:agentData="onUpdateAgentData" @queryAgentCard="queryAgentCard" @confirmAgent="confirmAgent" />
  </tiny-collapse-item>
</template>

<style scoped lang="less">
.mcp-server-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .mcp-server-item {
    border: none;
    border-radius: 6px;
    padding: 6px 10px;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: rgba(246, 246, 246, 1);
    }

    &-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    &-name {
      font-size: 14px;
      font-weight: 600;
      color: #191919;
    }

    &-description {
      font-size: 12px;
      color: #999;
      overflow-wrap: break-word;
    }

    &-enabled {
      margin-left: 4px;
    }
  }
}

.mcp-server-list-empty {
  margin-top: 12px;
}

.mcp-server-item-empty {
  border: 1px dashed #d9d9d9;
  border-radius: 8px;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

.mcp-server-item-empty-icon {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #8c8c8c;
  font-size: 13px;
  line-height: 20px;
  text-align: center;
  letter-spacing: 0.2px;
}

.mcp-server-item-empty-plus-icon {
  width: 12px;
  height: 12px;
  color: #595959;
}

:deep(.mcp-server-item-actions-popover) {
  padding: 0;
  border: none;
}

.mcp-server-item-actions {
  &>div {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px 16px;

    &:hover {
      background-color: #f5f5f5;
    }
  }
}
</style>
