<script lang="ts" setup>
import type { IRendererSlotsProps } from '@opentiny/genui-sdk-vue';
import { IconDownload } from '@opentiny/vue-icon';
import { useExportVueCode } from '../hooks/use-generate-vue-code';
import { useExportReactCode } from '../hooks/use-generate-react-code';

type ExportFramework = 'Vue' | 'React';

const props = defineProps<IRendererSlotsProps & { exportFramework?: ExportFramework }>();
const { exportVueCode } = useExportVueCode();
const { exportReactCode } = useExportReactCode();
const exportCode = () =>
  props.exportFramework === 'React' ? exportReactCode(props.schema) : exportVueCode(props.schema);
const TinyIconDownload = IconDownload();
</script>

<template>
  <div class="renderer-header">
    <button
      v-if="props.isFinished && !props.isError"
      type="button"
      class="schema-export-button"
      @click="exportCode"
    >
      <TinyIconDownload class="schema-export-icon" />
      <span class="schema-export-label">导出源码</span>
    </button>
  </div>
</template>
