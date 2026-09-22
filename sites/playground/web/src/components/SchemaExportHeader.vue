<script lang="ts" setup>
import type { IRendererSlotsProps } from '@opentiny/genui-sdk-vue';
import { IconDownload } from '@opentiny/vue-icon';
import { useExportVueCode } from '../hooks/use-generate-vue-code';

const props = defineProps<IRendererSlotsProps>();
const { exportVueCode } = useExportVueCode();
const TinyIconDownload = IconDownload();
</script>

<template>
  <div class="renderer-header">
    <button
      v-if="props.isFinished && !props.isError"
      type="button"
      class="schema-export-button"
      @click="exportVueCode(props.schema)"
    >
      <TinyIconDownload class="schema-export-icon" />
      <span class="schema-export-label">导出源码</span>
    </button>
  </div>
</template>
