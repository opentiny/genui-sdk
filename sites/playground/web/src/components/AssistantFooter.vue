<script lang="ts" setup>
import { iconRefresh, iconCopy, IconArrowRight, IconArrowLeft } from '@opentiny/vue-icon';
import { TinyButton } from '@opentiny/vue';
import { AutoTip } from '@opentiny/vue-directive';
import { GENUI_CONFIG } from '@opentiny/genui-sdk-vue';
import { ref, computed, inject } from 'vue';
import copy from 'clipboard-copy';
import type { IBubbleSlotsProps } from './common.types';
import { useGenerateMore } from '../continue-writing';
import FinishInfo from './FinishInfo.vue';
import { vFocusHoverSync } from './v-focus-hover-sync';
const props = defineProps<IBubbleSlotsProps>();

const vAutoTip = AutoTip;
const genuiConfig: any = inject(GENUI_CONFIG, null);

const tooltipEffect = computed(() => {
  return genuiConfig.theme === 'dark' ? 'light' : 'dark';
});

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
  return props.chatMessage['originChatMessage'] !== undefined;
});

const notFinished = computed(() => {
  return props.chatMessage.finishInfo?.choices?.[0]?.finish_reason !== 'stop';
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
const { markGenerateMore, revertGenerateMore } = useGenerateMore(props.messageManager, props.index);

</script>

<template>
  <div
    v-if="props.isFinished"
    class="playground-assistant-footer"
    :class="{ 'is-last': isLastBubble }"
  >
    <tiny-button
      type="text"
      :reset-time="0"
      :icon="RefreshIcon"
      v-auto-tip="{ always: true, content: '刷新', effect: tooltipEffect }"
      v-focus-hover-sync
      @click="refresh"
    >
    </tiny-button>
    <tiny-button
      type="text"
      :reset-time="0"
      :icon="CopyIcon"
      v-auto-tip="{ always: true, content: copyTooltip, effect: tooltipEffect }"
      v-focus-hover-sync
      @click="copyContent"
    >
    </tiny-button>
    <FinishInfo style="margin-left: 8px;" :data="props.chatMessage.finishInfo" />
    <tiny-button
      v-if="notFinished"
      :reset-time="0"
      type="text"
      :icon="ArrowRightIcon"
      v-auto-tip="{ always: true, content: '继续生成（实验特性）', effect: tooltipEffect }"
      v-focus-hover-sync
      @click="markGenerateMore"
    >
    </tiny-button>
    <tiny-button
      v-if="revertAvailable"
      :reset-time="0"
      type="text"
      :icon="ArrowLeftIcon"
      v-auto-tip="{ always: true, content: '撤回上次继续生成（实验特性）', effect: tooltipEffect }"
      v-focus-hover-sync
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
