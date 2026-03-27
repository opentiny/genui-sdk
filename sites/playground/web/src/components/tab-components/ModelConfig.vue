<script setup>
import { ref, inject } from 'vue';
import {
  TinyBaseSelect,
  TinySlider,
  TinyInput,
  TinyButton,
  TinyDialogBox,
  TinyPopover,
  TinyTooltip,
} from '@opentiny/vue';
import { iconPlus, iconEllipsis, iconEdit, iconDel } from '@opentiny/vue-icon';
import SelectTemplateDialog from './SelectTemplateDialog.vue';

const emit = defineEmits(['update:llmConfig', 'createNewTemplate', 'update-custom-examples']);
const playgroundContext = inject('playgroundContext');
const { llmConfig, modelData, customExamples } = playgroundContext;

const IconPlus = iconPlus();
const IconEllipsis = iconEllipsis();
const IconEdit = iconEdit();
const IconDel = iconDel();

const ENABLE_TEMPLATE = import.meta.env.VITE_ENABLE_TEMPLATE === 'true';
const showAddPromptBox = ref(false);
const activeIndex = ref(null);
const appendPrompt = ref('');
const isEditPrompt = ref(false);
const showSelectExampleBox = ref(false);

const updateConfig = (updates) => {
  Object.assign(llmConfig, updates);
};

const updateModel = (model) => updateConfig({ model });

const updateTemperature = (temperature) => updateConfig({ temperature });

const updatePromptList = (promptList) => updateConfig({ promptList });

const addPrompt = () => {
  if (!appendPrompt.value) {
    return;
  }

  const promptList = llmConfig.promptList || [];
  promptList.push(appendPrompt.value);

  updatePromptList(promptList);
  appendPrompt.value = '';
  showAddPromptBox.value = false;
};

const delPrompt = (index) => {
  const promptList = llmConfig.promptList || [];
  updatePromptList(promptList.filter((_, i) => i !== index));
};

const updatePrompt = (value, index) => {
  if (!appendPrompt.value) {
    return;
  }

  const promptList = llmConfig.promptList || [];
  updatePromptList(promptList.map((item, i) => (i === index ? value : item)));
  resetState();
};

const resetState = () => {
  isEditPrompt.value = false;
  activeIndex.value = null;
  appendPrompt.value = '';
  showAddPromptBox.value = false;
};

const editPrompt = (index) => {
  isEditPrompt.value = true;
  activeIndex.value = index;
  appendPrompt.value = llmConfig.promptList[index];
  showAddPromptBox.value = true;
};

const confirmSelectExampleList = (list) => {
  emit('update-custom-examples', list);
};

const delCustomExample = (index) => {
  const customExamples = props.customExamples || [];
  emit('update:custom-examples', customExamples.filter((_, i) => i !== index));
};

const editCustomExample = (id) => {
  emit('createNewTemplate', id);
};

const createNewTemplate = () => {
  emit('createNewTemplate');
};
</script>
<template>
  <div class="config-title">模型选择</div>
  <tiny-base-select :model-value="llmConfig.model" @update:model-value="updateModel" :options="modelData"
    :tooltip-config="{ always: false }" class="config-content"></tiny-base-select>
  <div class="config-title">模型温度</div>
  <tiny-slider
    :model-value="llmConfig.temperature"
    @update:model-value="updateTemperature"
    :step="0.1"
    :min="0"
    :max="1"
    show-input
    style="margin-bottom: 12px"
  >
    <template #default="slotScope">
      <b>{{ slotScope.slotScope }}</b>
    </template>
  </tiny-slider>
  <div class="config-title prompt-title">
    <span>提示词</span>
    <span>
      <tiny-button type="text" :icon="IconPlus" @click="showAddPromptBox = true"> </tiny-button>
    </span>
  </div>

  <div class="prompt-box">
    <div
      class="prompt-item"
      v-for="(prompt, index) in llmConfig.promptList"
      :key="index"
      :class="{ 'is-edit': isEditPrompt && activeIndex === index }"
    >
      <tiny-tooltip visible="auto" :content="prompt" effect="light">
        <div class="ellipsis">{{ prompt }}</div>
      </tiny-tooltip>
      <tiny-popover
        trigger="hover"
        popper-class="prompt-item-actions-popover"
        :visible-arrow="false"
        :append-to-body="false"
      >
        <template #default>
          <div class="prompt-item-actions">
            <div @click="editPrompt(index)">
              <IconEdit />
              <span>编辑</span>
            </div>
            <div @click="delPrompt(index)">
              <IconDel />
              <span>删除</span>
            </div>
          </div>
        </template>
        <template #reference>
          <tiny-button type="text" :icon="IconEllipsis"> </tiny-button>
        </template>
      </tiny-popover>
    </div>
  </div>
  <tiny-dialog-box
    v-model:visible="showAddPromptBox"
    :title="isEditPrompt ? '编辑提示词' : '添加提示词'"
    width="30%"
    :append-to-body="true"
  >
    <tiny-input
      type="textarea"
      class="prompt-item-input"
      :model-value="appendPrompt"
      :autosize="{ minRows: 6, maxRows: 10 }"
      @update:model-value="appendPrompt = $event"
      autofocus
    ></tiny-input>
    <template #footer>
      <tiny-button @click="resetState" round>取 消</tiny-button>
      <tiny-button type="primary"
        @click="isEditPrompt ? updatePrompt(appendPrompt, activeIndex) : addPrompt(activeIndex)" round>
        确 定
      </tiny-button>
    </template>
  </tiny-dialog-box>

  <!-- 选择示例模板 -->
  <template v-if="ENABLE_TEMPLATE">
    <div class="config-title prompt-title">
      <span>示例模板</span>
      <span>
        <tiny-button type="text" :icon="IconPlus" @click="showSelectExampleBox = true"> </tiny-button>
      </span>
    </div>

    <div class="prompt-item" v-for="(item, index) in customExamples" :key="item.id">
      <tiny-tooltip visible="auto" :content="item.name" effect="light">
        <div class="ellipsis">{{ item.name }}</div>
      </tiny-tooltip>
      <tiny-popover trigger="hover" popper-class="prompt-item-actions-popover" :visible-arrow="false"
        :append-to-body="false">
        <template #default>
          <div class="prompt-item-actions">
            <div @click="editCustomExample(item.id)">
              <IconEdit />
              <span>编辑</span>
            </div>
            <div @click="delCustomExample(index)">
              <IconDel />
              <span>删除</span>
            </div>
          </div>
        </template>
        <template #reference>
          <tiny-button type="text" :icon="IconEllipsis"> </tiny-button>
        </template>
      </tiny-popover>
    </div>

    <select-template-dialog v-model:visible="showSelectExampleBox" :custom-examples="customExamples"
      @confirmSelectExample="confirmSelectExampleList" @createNewTemplate="createNewTemplate" />
  </template>
</template>

<style scoped lang="less">
.config-title {
  margin-bottom: 12px;
  font-size: 14px;
  color: #595959;
  line-height: 32px;
}

.config-content {
  margin-bottom: 20px;
}

.prompt-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.prompt-box {
  display: flex;
  flex-direction: column-reverse;
}

.prompt-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 8px;
  padding: 8px 12px;

  &:hover,
  &.is-edit {
    background-color: #f5f5f5;

    button.tiny-button.prompt-item-close-icon {
      display: flex;
    }
  }

  .ellipsis {
    width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

:deep(.prompt-item-actions-popover) {
  padding: 0;
  border: none;
}

.prompt-item-actions {
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
