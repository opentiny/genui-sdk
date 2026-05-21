<script setup>
import { inject } from 'vue';
import { TinyCheckbox } from '@opentiny/vue';

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
      调用结果添加到上下文
    </tiny-checkbox>
  </div>
  <div class="tool-call-config">
    <tiny-checkbox :model-value="chatConfig.showThinkingResult" @update:model-value="updateShowThinkingResult">
      调用结果展示在界面中
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
