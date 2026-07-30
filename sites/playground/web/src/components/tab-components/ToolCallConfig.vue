<script setup>
import { inject } from 'vue';
import { TinyCheckbox } from '@opentiny/vue';
import { t } from '../../i18n';

const playgroundContext = inject('playgroundContext');
const { chatConfig } = playgroundContext;

const updateAddToolCallContext = (value) => {
  chatConfig.addToolCallContext = value;
};

const updateShowThinkingResult = (value) => {
  chatConfig.showThinkingResult = value;
};
</script>

<template>
  <div class="tool-call-config">
    <tiny-checkbox :model-value="chatConfig.addToolCallContext" @update:model-value="updateAddToolCallContext">
      {{ t('tool.addContext') }}
    </tiny-checkbox>
  </div>
  <div class="tool-call-config">
    <tiny-checkbox :model-value="chatConfig.showThinkingResult" @update:model-value="updateShowThinkingResult">
      {{ t('tool.showInUI') }}
    </tiny-checkbox>
  </div>
</template>

<style scoped lang="less">
.tool-call-config {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #595959;

  & + & {
    margin-top: 12px;
  }
}
</style>
