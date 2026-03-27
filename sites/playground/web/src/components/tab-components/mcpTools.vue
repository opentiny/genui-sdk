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
} from '@opentiny/vue';
import { iconDel, iconEdit, iconPlus, iconEllipsis } from '@opentiny/vue-icon';

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

const showToolFormDialog = ref(false);
const addToolLoading = ref(false);
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

const updateServerEnabled = (server, enabled) => {
  const mcpServers = llmConfig.mcpServers || [];
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
    <div class="mcp-server-title">
      <span>MCP 服务</span>
      <span>
        <tiny-button type="text" :icon="IconPlus" @click="addMCPServer"> </tiny-button>
      </span>
    </div>
    <div class="mcp-server-list">
      <div class="mcp-server-item" v-for="(server, index) in llmConfig.mcpServers" :key="server.name">
        <div class="mcp-server-item-header">
          <div class="mcp-server-item-name">{{ server.name }}</div>
          <div>
            <tiny-switch
              :model-value="server.enabled"
              @update:model-value="updateServerEnabled(server, $event)"
              class="mcp-server-item-enabled"
            ></tiny-switch>
            <tiny-popover
              trigger="hover"
              popper-class="mcp-server-item-actions-popover"
              :visible-arrow="false"
              :append-to-body="false"
            >
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
    <div class="mcp-server-tool-call-context" style="margin-top: 12px">
      <tiny-checkbox :model-value="chatConfig.addToolCallContext" @update:model-value="updateAddToolCallContext">
        调用结果添加到上下文
      </tiny-checkbox>
    </div>
    <div class="mcp-server-tool-call-context" style="margin-top: 12px">
      <tiny-checkbox :model-value="chatConfig.showThinkingResult" @update:model-value="updateShowThinkingResult">
        调用结果展示在界面中
      </tiny-checkbox>
    </div>
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
          <tiny-input
            v-model="mcpServerData.timeout"
            :placeholder="String(DEFAULT_TIMEOUT_SECONDS)"
            type="number"
          ></tiny-input>
        </tiny-form-item>
        <tiny-form-item label="描述" prop="description">
          <tiny-input type="textarea" v-model="mcpServerData.description" placeholder="描述"></tiny-input>
        </tiny-form-item>
      </tiny-form>
      <template #footer>
        <tiny-button type="primary" :loading="addToolLoading" @click="confirmMCPServer">确认</tiny-button>
      </template>
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
:deep(.mcp-server-item-actions-popover) {
  padding: 0;
  border: none;
}
.mcp-server-item-actions {
  & > div {
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
