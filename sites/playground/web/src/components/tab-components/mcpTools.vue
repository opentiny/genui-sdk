<script setup>
import { ref, inject } from 'vue';
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
import AgentDialog from './AgentDialog.vue';

const playgroundContext = inject('playgroundContext');
const { llmConfig, chatConfig } = playgroundContext;

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

/** 错误提示中展示响应正文，过长时截断 */
function truncateRaw(text, maxLen = 2000) {
  const t = String(text ?? '');
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen)}…`;
}

/** JSON 仅有常见 error 字段时只展示错误信息，不展示 "error" 键名 */
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
  description: '',
  index: -1,
});

const updateConfig = (updates) => {
  Object.assign(llmConfig, updates);
};

const updateChatConfig = (updates) => {
  Object.assign(chatConfig, updates);
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
    description: '',
    index: -1,
  };
  agentCard.value = null;
  agentCardStatus.value = 'idle';
  agentCardError.value = '';
  agentQueryLoading.value = false;
};

const deleteMCPServer = (server) => {
  const mcpServers = llmConfig.mcpServers || [];
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
    description: '',
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
    description: agent.description || '',
    index,
  };
  agentCard.value = agent;
  agentCardStatus.value = agent ? 'success' : 'idle';
  agentCardError.value = '';
  agentQueryLoading.value = false;
  openAgentDialog();
};

const deleteAgent = (agent) => {
  const agents = llmConfig.agents || [];
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
      const mcpServers = llmConfig.mcpServers || [];
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
  } catch (error) {
    agentCardStatus.value = 'error';
    agentCardError.value = error?.message ? `获取 Agent Card 失败：${error.message}` : '获取 Agent Card 失败';
  } finally {
    agentQueryLoading.value = false;
  }
};

const confirmAgent = () => {
  const { name, agentCardUrl, description, index } = agentData.value;

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

  const agents = llmConfig.agents || [];
  const card = agentCard.value;
  // 启用状态仅在列表里切换，与 MCP 服务一致；新建默认开启，编辑保留当前列表项状态
  const enabledValue = index > -1 ? (agents[index]?.enabled ?? true) : true;
  const nextAgent = {
    // 先保留 Agent Card 上的所有字段（version/api/auth/capabilities 等）
    ...card,
    // 再用前端表单中的值覆盖名称和描述
    name: name || card?.name,
    description: description || card?.description || '',
    // 前端专属字段
    agentCardUrl,
    enabled: enabledValue,
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
  const mcpServers = llmConfig.mcpServers || [];
  const updatedServers = mcpServers.map((s) => (s.name === server.name ? { ...s, enabled } : s));
  updateConfig({ mcpServers: updatedServers });
};

const updateAgentEnabled = (agent, enabled) => {
  const agents = llmConfig.agents || [];
  const updatedAgents = agents.map((a) => (a.name === agent.name ? { ...a, enabled } : a));
  updateConfig({ agents: updatedAgents });
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
      <tiny-collapse-item name="agent" title="Agent（a2ademo）">
        <template #title-right>
          <tiny-button type="text" :icon="IconPlus" @click.stop="addAgent"> </tiny-button>
        </template>
        <div class="mcp-server-list">
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
    <tiny-dialog-box
      v-model:visible="showToolFormDialog"
      :title="mcpServerData.index > -1 ? '编辑 MCP 服务' : '添加 MCP 服务'"
      width="500px"
      @close="closeToolFormDialog"
      :append-to-body="true"
    >
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
    <AgentDialog
      :visible="showAgentFormDialog"
      :agent-data="agentData"
      :agent-card="agentCard"
      :agent-card-status="agentCardStatus"
      :agent-card-error="agentCardError"
      :agent-query-loading="agentQueryLoading"
      :add-agent-loading="addAgentLoading"
      @update:visible="(val) => { if (!val) closeAgentDialog(); else showAgentFormDialog = val; }"
      @update:agentData="(val) => (agentData = val)"
      @queryAgentCard="queryAgentCard"
      @confirmAgent="confirmAgent"
    />
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

    &-delete {
      margin-right: 4px;
    }
  }
}

.mcp-server-tool-call-context {
  margin-top: 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  color: #595959;

  &:last-child {
    margin-bottom: 16px;
  }
}

:deep(.tiny-collapse-item__header) {
  padding-left: 0 !important;
  padding-right: 0 !important;
  border-bottom: none !important;
}

:deep(.tiny-collapse-item__content) {
  padding: 0 !important;
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

.agent-url-action-row {
  display: flex;
  align-items: center;
  gap: 8px;

  :deep(.tiny-input) {
    flex: 1;
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
