<script lang="ts" setup>
import type { IRendererSlotsProps } from './common.types';
import { iconCopy } from '@opentiny/vue-icon';
import { TinyButton } from '@opentiny/vue';
import { AutoTip } from '@opentiny/vue-directive';
import copy from 'clipboard-copy';
const props = defineProps<IRendererSlotsProps>();

const vAutoTip = AutoTip;

const CopyIcon = iconCopy();

const copySchema = () => {
  copy(JSON.stringify(props.schema, null, 2));
};
</script>

<template>
  <div v-if="props.isFinished" class="schema-card-footer">
    <tiny-button type="text" :icon="CopyIcon" v-auto-tip="{ always: true, content: '复制' }" @click="copySchema">
    </tiny-button>
  </div>
</template>
<style lang="scss" scoped>
.schema-card-footer {
  display: flex;
  align-items: center;
  transition: opacity 0.2s ease;
  opacity: 0;
}
.schema-render-container [schema]:hover + .schema-card-footer,  .schema-card-footer:hover{
  opacity: 1;
}
</style>
