<script setup>
import { ref } from 'vue';
import { TinyCollapse } from '@opentiny/vue';
import { AgentPanel, McpServerPanel, SkillPanel } from './tool-panels';

const activePanels = ref(['mcp', 'agent', 'skills']);
</script>

<template>
  <div>
    <tiny-collapse class="playground-tools" v-model="activePanels">
      <McpServerPanel />
      <AgentPanel />
      <SkillPanel />
    </tiny-collapse>
  </div>
</template>

<style scoped lang="less">
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
    }

    .tiny-collapse-item__content {
      padding: 0 !important;
      border: none;
    }
  }
}
</style>
