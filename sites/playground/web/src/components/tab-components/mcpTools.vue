<script setup>
import { ref } from 'vue';
import { TinyCollapse } from '@opentiny/vue';
import { AgentPanel, OpenApiServicePanel, McpServerPanel, SkillPanel } from './tool-panels';
import ToolCallConfig from './ToolCallConfig.vue';

const activePanels = ref(['mcp', 'agent', 'skills', 'openApiTools']);
</script>

<template>
  <div class="mcp-tools">
    <div class="mcp-tools__scroll">
      <div class="mcp-tools__scroll-inner">
        <tiny-collapse class="playground-tools" v-model="activePanels">
          <McpServerPanel />
          <AgentPanel />
          <SkillPanel />
          <OpenApiServicePanel />
        </tiny-collapse>
      </div>
    </div>
    <div class="mcp-tools__footer">
      <ToolCallConfig />
    </div>
  </div>
</template>

<style scoped lang="less">
.mcp-tools {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.mcp-tools__scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
}

.mcp-tools__scroll-inner {
  padding: 0 24px;
}

.mcp-tools__footer {
  flex-shrink: 0;
  padding: 12px 24px 16px;
  background: var(--ti-base-color-bg, #fff);
}

:deep(.tiny-collapse) {
  border-bottom: none;

  .tiny-collapse-item {
    padding-bottom: 16px;

    &:first-of-type {
      border-top: none;
    }

    &:last-of-type {
      border-bottom: none;
    }

    .tiny-collapse-item__header {
      padding: 0;
      border-bottom: none;
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .tiny-collapse-item__content {
      padding: 0 !important;
      border: none;
    }
  }
}
</style>
