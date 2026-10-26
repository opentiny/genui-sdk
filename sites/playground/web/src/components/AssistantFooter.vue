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
import { t } from '../i18n';
const props = defineProps<IBubbleSlotsProps>();

const vAutoTip = AutoTip;
const genuiConfig: any = inject(GENUI_CONFIG, null);

const tooltipEffect = computed(() => {
  return genuiConfig?.value?.colorScheme === 'dark' ? 'dark' : 'light';
});

const RefreshIcon = iconRefresh();
const CopyIcon = iconCopy();
const ArrowRightIcon = IconArrowRight();
const ArrowLeftIcon = IconArrowLeft();

const copyTooltip = ref(t('chatFooter.copy'));

const index = computed(() => props.messageIndexes.at(-1) ?? -1);
const chatMessage = computed(() => props.messages.at(-1) as any);
const isLastBubble = computed(() => {
  return index.value === props.messageEngine.messages.value.length - 1;
});

const revertAvailable = computed(() => {
  return chatMessage.value?.originChatMessage !== undefined;
});

const notFinished = computed(() => {
  return chatMessage.value?.finishInfo?.choices?.[0]?.finish_reason !== 'stop';
});

const copyContent = async () => {
  const content = chatMessage.value?.content;
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
  const { messages, send } = props.messageEngine;
  const messageIndex = index.value;
  messages.value = messages.value.slice(0, messageIndex);
  send();
};
const { markGenerateMore, revertGenerateMore } = useGenerateMore(props.messageEngine, index.value);

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
      v-auto-tip="{ always: true, content: t('chatFooter.refresh'), effect: tooltipEffect }"
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
    <FinishInfo style="margin-left: 8px;" :chat-message="chatMessage" />
    <tiny-button
      v-if="notFinished"
      :reset-time="0"
      type="text"
      :icon="ArrowRightIcon"
      v-auto-tip="{ always: true, content: t('chatFooter.continueGenerate'), effect: tooltipEffect }"
      v-focus-hover-sync
      @click="markGenerateMore"
    >
    </tiny-button>
    <tiny-button
      v-if="revertAvailable"
      :reset-time="0"
      type="text"
      :icon="ArrowLeftIcon"
      v-auto-tip="{ always: true, content: t('chatFooter.revertContinueGenerate'), effect: tooltipEffect }"
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

  &:not(.is-last) {
    opacity: 0;
  }

  &.is-last {
    opacity: 1;
  }
}
</style>

<style lang="scss">
.tr-bubble[data-role='assistant']:hover .playground-assistant-footer,
.playground-assistant-footer:hover {
  opacity: 1;
}
</style>
