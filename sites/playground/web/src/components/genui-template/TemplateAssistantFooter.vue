<script lang="ts" setup>
  import { ref, computed } from 'vue';
  import copy from 'clipboard-copy';
  import { TinyButton } from '@opentiny/vue';
  import { AutoTip } from '@opentiny/vue-directive';
import { iconRefresh, iconCopy } from '@opentiny/vue-icon';
import type { IBubbleSlotsProps } from '@opentiny/genui-sdk-vue';

const emit = defineEmits(['refresh']);

const props = defineProps<IBubbleSlotsProps>();

const RefreshIcon = iconRefresh();
const CopyIcon = iconCopy();

const vAutoTip = AutoTip;
const copyTooltip = ref('复制');

const isLastBubble = computed(() => {
  const { messages } = props.messageManager;
  return props.index === messages.value.length - 1;
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
  emit('refresh', props);
};
</script>

<template>
  <div v-if="props.isFinished" class="playground-assistant-footer" :class="{ 'is-last': isLastBubble }">
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
.tr-bubble__content:hover + .playground-assistant-footer,
.playground-assistant-footer:hover {
  opacity: 1;
}
</style>
