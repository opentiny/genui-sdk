<script lang="ts" setup>
import { ref, computed } from 'vue';
import { TinyButton } from '@opentiny/vue';
import { AutoTip } from '@opentiny/vue-directive';
import { iconRefresh, iconCopy } from '@opentiny/vue-icon';
import type { IBubbleSlotsProps } from '../common.types';
import { t } from '../../i18n';

const emit = defineEmits(['refresh', 'copy']);

const props = defineProps<IBubbleSlotsProps>();

const RefreshIcon = iconRefresh();
const CopyIcon = iconCopy();

const vAutoTip = AutoTip;
const copyTooltip = ref(t('chatFooter.copy'));

const index = computed(() => props.messageIndexes.at(-1) ?? -1);
const isLastBubble = computed(() => {
  return index.value === props.messageEngine.messages.value.length - 1;
});

const copyContent = async () => {
  emit('copy', props);
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
      v-auto-tip="{ always: true, content: t('chatFooter.refresh'), effect: 'light' }"
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

  opacity: 1;
}
</style>
