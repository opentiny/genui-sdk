<script setup>
import { ref, computed } from 'vue';
import {
  TinyButton,
  TinySwitch,
  TinyDialogBox,
  TinyForm,
  TinyFormItem,
  TinyInput,
  TinyNotify,
  TinyPopover,
  TinyCheckbox,
  TinyCollapse,
  TinyCollapseItem,
} from '@opentiny/vue';
import { iconDel, iconEdit, iconPlus, iconEllipsis } from '@opentiny/vue-icon';

const props = defineProps({
  llmConfig: {
    type: Object,
    required: true,
  },
  chatConfig: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['update:llmConfig', 'update:chatConfig']);

const IconPlus = iconPlus();
const IconDel = iconDel();
const IconEdit = iconEdit();
const IconEllipsis = iconEllipsis();

const DEFAULT_TIMEOUT_SECONDS = 10000;

function parseHeadersTextToObject(text) {
  const headers = {};
  if (!text) return headers;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue; // 忽略空行和注释
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue; // 无等号行跳过

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();

    if (!key) continue;
    headers[key] = value;
  }
  return headers;
}

const llmConfig = computed(() => props.llmConfig);
const chatConfig = computed(() => props.chatConfig);

const activePanels = ref(['mcp', 'agent']);
const showToolFormDialog = ref(false);
const addToolLoading = ref(false);
const showAgentFormDialog = ref(false);
const addAgentLoading = ref(false);
const agentQueryLoading = ref(false);
const agentCard = ref(null);
const agentCardStatus = ref('idle'); // idle | loading | success | error
const agentCardError = ref('');
const checkMcpController = ref(null);
const mcpServerFormRef = ref(null);

const headersPlaceholder = `Content-Type=application/json
Authorization=Bearer token`;

const mcpServerData = ref({
  name: '',
  url: '',
  description: '',
  headers: '',
  timeout: DEFAULT_TIMEOUT_SECONDS,
});

const agentData = ref({
  name: '',
  agentCardUrl: '',
  index: -1,
});

const updateConfig = (updates) => {
  emit('update:llmConfig', { ...llmConfig.value, ...updates });
};

const updateChatConfig = (updates) => {
  emit('update:chatConfig', { ...chatConfig.value, ...updates });
};

const openMCPServerDialog = () => {
  showToolFormDialog.value = true;
};

const closeToolFormDialog = () => {
  // 关闭弹窗时中断校验请求
  if (checkMcpController.value) {
    checkMcpController.value.abort();
    checkMcpController.value = null;
  }
  mcpServerFormRef.value?.resetFields();
  showToolFormDialog.value = false;
};

const openAgentDialog = () => {
  showAgentFormDialog.value = true;
};

const closeAgentDialog = () => {
  showAgentFormDialog.value = false;
  agentData.value = {
    name: '',
    agentCardUrl: '',
    index: -1,
  };
  agentCard.value = null;
  agentCardStatus.value = 'idle';
  agentCardError.value = '';
  agentQueryLoading.value = false;
};

const deleteMCPServer = (server) => {
  const mcpServers = llmConfig.value.mcpServers || [];
  updateConfig({
    mcpServers: mcpServers.filter((s) => s.name !== server.name),
  });
};

const editMCPServer = (server, index) => {
  mcpServerData.value = {
    ...server,
    index,
    headers: Object.entries(server.headers || {})
      .map(([key, value]) => `${key}=${value}`)
      .join('\n'),
  };
  openMCPServerDialog();
};
const addMCPServer = () => {
  mcpServerData.value.index = -1;
  openMCPServerDialog();
};

const addAgent = () => {
  agentData.value = {
    name: '',
    agentCardUrl: '',
    index: -1,
  };
  agentCard.value = null;
  agentCardStatus.value = 'idle';
  agentCardError.value = '';
  agentQueryLoading.value = false;
  openAgentDialog();
};

const editAgent = (agent, index) => {
  agentData.value = {
    name: agent.name || '',
    agentCardUrl: agent.agentCardUrl || '',
    index,
  };
  agentCard.value = agent;
  agentCardStatus.value = agent ? 'success' : 'idle';
  agentCardError.value = '';
  agentQueryLoading.value = false;
  openAgentDialog();
};

const deleteAgent = (agent) => {
  const agents = llmConfig.value.agents || [];
  updateConfig({
    agents: agents.filter((a) => a.name !== agent.name),
  });
};

const confirmMCPServer = async () => {
  addToolLoading.value = true;
  try {
    const checkMcpUrl = import.meta.env.VITE_CHECK_MCP_URL;

    if (checkMcpController.value) {
      checkMcpController.value.abort();
    }

    const controller = new AbortController();
    checkMcpController.value = controller;
    const { name, url, headers, timeout, description } = mcpServerData.value;
    const res = await fetch(checkMcpUrl, {
      method: 'POST',
      body: JSON.stringify({
        name,
        url,
        headers: parseHeadersTextToObject(headers),
        timeout: timeout || DEFAULT_TIMEOUT_SECONDS,
      }),
      signal: controller.signal,
    });
    const data = await res.json();

    if (data.code === 200) {
      const mcpServers = llmConfig.value.mcpServers || [];
      if (mcpServerData.value.index > -1) {
        mcpServers[mcpServerData.value.index] = {
          name,
          url,
          enabled: true,
          description,
          headers: parseHeadersTextToObject(headers),
          timeout: timeout || DEFAULT_TIMEOUT_SECONDS,
        };
      } else {
        mcpServers.push({
          name,
          url,
          enabled: true,
          description,
          headers: parseHeadersTextToObject(headers),
          timeout: timeout || DEFAULT_TIMEOUT_SECONDS,
        });
      }

      updateConfig({ mcpServers });
      closeToolFormDialog();
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    if (error?.name === 'AbortError') return;
    TinyNotify({
      type: 'error',
      message: error.message,
      position: 'top-right',
    });
  } finally {
    checkMcpController.value = null;
    addToolLoading.value = false;
  }
};

const queryAgentCard = async () => {
  const { agentCardUrl } = agentData.value;

  if (!agentCardUrl) {
    TinyNotify({
      type: 'warning',
      message: '请填写 Agent Card URL',
      position: 'top-right',
    });
    return;
  }

  agentQueryLoading.value = true;
  agentCardStatus.value = 'loading';
  agentCardError.value = '';

  try {
    const res = await fetch(agentCardUrl);
    if (!res.ok) {
      throw new Error(`获取 Agent Card 失败，状态码：${res.status}`);
    }
    const card = await res.json();
    agentCard.value = card;
    agentCardStatus.value = 'success';
  } catch (error) {
    agentCardStatus.value = 'error';
    agentCardError.value = error?.message || '获取 Agent Card 失败';
  } finally {
    agentQueryLoading.value = false;
  }
};

const confirmAgent = () => {
  const { name, agentCardUrl, index } = agentData.value;

  if (!name || !agentCardUrl) {
    TinyNotify({
      type: 'warning',
      message: '请填写名称和 Agent Card URL',
      position: 'top-right',
    });
    return;
  }

  if (!agentCard.value || agentCardStatus.value !== 'success') {
    TinyNotify({
      type: 'warning',
      message: '请先查询并确认 Agent Card 信息',
      position: 'top-right',
    });
    return;
  }

  const agents = llmConfig.value.agents || [];
  const card = agentCard.value;
  const nextAgent = {
    ...card,
    name: name || card.name,
    agentCardUrl,
  };

  if (index > -1) {
    agents[index] = nextAgent;
  } else {
    agents.push(nextAgent);
  }

  updateConfig({ agents });
  closeAgentDialog();
};

const updateServerEnabled = (server, enabled) => {
  const mcpServers = llmConfig.value.mcpServers || [];
  const updatedServers = mcpServers.map((s) => (s.name === server.name ? { ...s, enabled } : s));
  updateConfig({ mcpServers: updatedServers });
};

const updateAddToolCallContext = (value) => {
  updateChatConfig({ addToolCallContext: value });
};

const updateShowThinkingResult = (value) => {
  updateChatConfig({ showThinkingResult: value });
};
</script>
<template>
  <div>
    <tiny-collapse v-model="activePanels">
      <tiny-collapse-item name="mcp" title="MCP 服务">
        <template #title-right>
          <tiny-button type="text" :icon="IconPlus" @click.stop="addMCPServer"></tiny-button>
        </template>
        <div class="mcp-server-list">
          <div class="mcp-server-item" v-for="(server, index) in llmConfig.mcpServers" :key="server.name">
            <div class="mcp-server-item-header">
              <div class="mcp-server-item-name">{{ server.name }}</div>
              <div>
                <tiny-switch :model-value="server.enabled" @update:model-value="updateServerEnabled(server, $event)"
                  class="mcp-server-item-enabled"></tiny-switch>
                <tiny-popover trigger="hover" popper-class="mcp-server-item-actions-popover" :visible-arrow="false"
                  :append-to-body="false">
                  <template #default>
                    <div class="mcp-server-item-actions">
                      <div @click="editMCPServer(server, index)">
                        <IconEdit />
                        <span>编辑</span>
                      </div>
                      <div @click="deleteMCPServer(server)">
                        <IconDel />
                        <span>移除</span>
                      </div>
                    </div>
                  </template>
                  <template #reference>
                    <tiny-button type="text" :icon="IconEllipsis"> </tiny-button>
                  </template>
                </tiny-popover>
              </div>
            </div>
            <div class="mcp-server-item-description">{{ server.description }}</div>
          </div>
        </div>
        <div class="mcp-server-tool-call-context">
          <tiny-checkbox :model-value="chatConfig.addToolCallContext" @update:model-value="updateAddToolCallContext">
            调用结果添加到上下文
          </tiny-checkbox>
        </div>
        <div class="mcp-server-tool-call-context" style="margin-top: 12px">
          <tiny-checkbox :model-value="chatConfig.showThinkingResult" @update:model-value="updateShowThinkingResult">
            调用结果展示在界面中
          </tiny-checkbox>
        </div>
      </tiny-collapse-item>
      <tiny-collapse-item name="agent" title="Agent">
        <template #title-right>
          <tiny-button type="text" :icon="IconPlus" @click.stop="addAgent"> </tiny-button>
        </template>
        <div class="mcp-server-list">
          <div class="mcp-server-item" v-for="(agent, index) in llmConfig.agents || []" :key="agent.name">
            <div class="mcp-server-item-header">
              <div class="mcp-server-item-name">{{ agent.name }}</div>
              <div>
                <tiny-popover trigger="hover" popper-class="mcp-server-item-actions-popover" :visible-arrow="false"
                  :append-to-body="false">
                  <template #default>
                    <div class="mcp-server-item-actions">
                      <div @click="editAgent(agent, index)">
                        <IconEdit />
                        <span>编辑</span>
                      </div>
                      <div @click="deleteAgent(agent)">
                        <IconDel />
                        <span>移除</span>
                      </div>
                    </div>
                  </template>
                  <template #reference>
                    <tiny-button type="text" :icon="IconEllipsis"> </tiny-button>
                  </template>
                </tiny-popover>
              </div>
            </div>
            <div class="mcp-server-item-description">{{ agent.description }}</div>
          </div>
        </div>
      </tiny-collapse-item>
    </tiny-collapse>
    <tiny-dialog-box v-model:visible="showToolFormDialog" :title="mcpServerData.index > -1 ? '编辑 MCP 服务' : '添加 MCP 服务'"
      width="500px" @close="closeToolFormDialog">
      <tiny-form ref="mcpServerFormRef" :model="mcpServerData" label-width="120px" label-position="left">
        <tiny-form-item label="名称" prop="name" required>
          <tiny-input v-model="mcpServerData.name" placeholder="MCP 服务"></tiny-input>
        </tiny-form-item>
        <tiny-form-item label="URL" prop="url" required>
          <tiny-input v-model="mcpServerData.url" placeholder="http://localhost:3000/mcp"></tiny-input>
        </tiny-form-item>
        <tiny-form-item label="请求头" prop="headers">
          <tiny-input v-model="mcpServerData.headers" :placeholder="headersPlaceholder" type="textarea"></tiny-input>
        </tiny-form-item>
        <tiny-form-item label="超时（毫秒）" prop="timeout">
          <tiny-input v-model="mcpServerData.timeout" :placeholder="String(DEFAULT_TIMEOUT_SECONDS)"
            type="number"></tiny-input>
        </tiny-form-item>
        <tiny-form-item label="描述" prop="description">
          <tiny-input type="textarea" v-model="mcpServerData.description" placeholder="描述"></tiny-input>
        </tiny-form-item>
      </tiny-form>
      <template #footer>
        <tiny-button type="primary" :loading="addToolLoading" @click="confirmMCPServer">确认</tiny-button>
      </template>
    </tiny-dialog-box>
    <tiny-dialog-box v-model:visible="showAgentFormDialog" :title="agentData.index > -1 ? '编辑 Agent' : '添加 Agent'"
      width="500px" @close="closeAgentDialog">
      <tiny-form :model="agentData" label-width="120px" label-position="left">
        <tiny-form-item label="名称" prop="name" required>
          <tiny-input v-model="agentData.name" placeholder="Agent 名称（用于在界面展示）"></tiny-input>
        </tiny-form-item>
        <tiny-form-item label="Agent Card URL" prop="agentCardUrl" required>
          <tiny-input v-model="agentData.agentCardUrl"
            placeholder="完整的 Agent Card 地址，例如 http://localhost:3100/a2a/agent"></tiny-input>
        </tiny-form-item>
      </tiny-form>
      <template #footer>
        <tiny-button type="primary" :loading="agentQueryLoading" @click="queryAgentCard"
          v-if="agentCardStatus === 'idle' || agentCardStatus === 'error'">
          {{ agentCardStatus === 'error' ? '重试' : '查询' }}
        </tiny-button>
        <tiny-button type="primary" :loading="addAgentLoading" @click="confirmAgent"
          v-if="agentCardStatus === 'success'">
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
  </div>
</template>
<style scoped lang="less">
.mcp-server-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #595959;
}

.mcp-server-list {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  .mcp-server-item {
    border: 1px solid #e4e7ed;
    border-radius: 8px;
    padding: 8px 16px;

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

    &-delete {
      margin-right: 4px;
    }
  }
}

.mcp-server-tool-call-context {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #595959;
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
