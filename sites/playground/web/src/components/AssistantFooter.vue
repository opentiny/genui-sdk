<script lang="ts" setup>
import { iconRefresh, iconCopy, IconArrowRight, IconArrowLeft } from '@opentiny/vue-icon';
import { TinyButton } from '@opentiny/vue';
import { AutoTip } from '@opentiny/vue-directive';
import { ref, computed, reactive } from 'vue';
import copy from 'clipboard-copy';
import type { IBubbleSlotsProps } from './common.types';
const props = defineProps<IBubbleSlotsProps>();

const vAutoTip = AutoTip;

const RefreshIcon = iconRefresh();
const CopyIcon = iconCopy();
const ArrowRightIcon = IconArrowRight();
const ArrowLeftIcon = IconArrowLeft();

const copyTooltip = ref('复制');

const isLastBubble = computed(() => {
  const { messages } = props.messageManager;
  return props.index === messages.value.length - 1;
});

const revertAvailable = computed(() => {
  const { messages } = props.messageManager;
  return messages.value.length > 0 && !! messages.value[props.index].originChatMessage;
});

const notFinished = computed(() => {
  const { messages } = props.messageManager;
  return messages.value.length > 0 && messages.value[props.index].finishReason !== 'stop'; // TODO: add finish reason to message
});

const copyContent = async () => {
  const content = props.bubbleProps.content;
  let copyContent: string;
  if (typeof content === 'string') {
    copyContent = content;
  } else {
    copyContent = JSON.stringify(content);
  }
  try {
    await copy(copyContent);
  } catch (error) {
    console.error('复制失败', error);
  }
};


const refresh = () => {
  const { messages, send } = props.messageManager;
  const messageIndex = props.index;;
  messages.value = messages.value.slice(0, messageIndex);
  send();
};

const generateMore = () => {
  const { messages, send } = props.messageManager;
  const messageIndex = props.index;
  messages.value = messages.value.slice(0, messageIndex + 1);
  messages.value.push({
    role: 'user',
    content: `上一轮内容未完成，请从上次中断的地方的最后一个\`{\`继续往下输出，内容会自动拼接上一次的内容后面。不要生成已经输出过的内容, 否则拼接会失败，不要增加任何新的包裹，直接继续写`,
    messageType: 'user-action'
  });
  send();
}

const revertGenerateMore = () => {
  const { messages, send } = props.messageManager;
  const messageIndex = props.index;
  if (messages.value[messageIndex].originChatMessage) {
    messages.value[messageIndex] = reactive(JSON.parse(messages.value[messageIndex].originChatMessage));
    messages.value[messageIndex].id = messages.value[messageIndex].id + '1';
    console.log('revertGenerateMore: messages', messages.value);
  } else {
    console.warn('revertGenerateMore: originChatMessage not found');
  }

}
</script>

<template>
  <div
    v-if="props.isFinished"
    class="playground-assistant-footer"
    :class="{ 'is-last': isLastBubble }"
  >
    <tiny-button
      type="text"
      :icon="RefreshIcon"
      v-auto-tip="{ always: true, content: '刷新', effect: 'light' }"
      @click="refresh"
    >
    </tiny-button>
    <tiny-button
      type="text"
      :icon="CopyIcon"
      v-auto-tip="{ always: true, content: copyTooltip, effect: 'light' }"
      @click="copyContent"
    >
    </tiny-button>
    <tiny-button
      v-if="notFinished"
      type="text"
      :icon="ArrowRightIcon"
      v-auto-tip="{ always: true, content: '继续生成（Beta）', effect: 'light' }"
      @click="generateMore"
    >
    </tiny-button>
    <tiny-button
      v-if="revertAvailable"
      type="text"
      :icon="ArrowLeftIcon"
      v-auto-tip="{ always: true, content: '撤回上次继续生成（Beta）', effect: 'light' }"
      @click="revertGenerateMore"
    >
    </tiny-button>
  </div>
</template>
<style lang="scss" scoped>
.playground-assistant-footer {
  display: flex;
  align-items: center;
  transition: opacity 0.2s ease;
  
  // 非最后一个气泡默认隐藏，悬浮时显示
  &:not(.is-last) {
    opacity: 0;
  }
  
  &.is-last {
    opacity: 1;
  }
}
// 悬浮到气泡内容上时显示工具栏
.tr-bubble__content:hover + .playground-assistant-footer,  .playground-assistant-footer:hover{
  opacity: 1;
}
</style>
