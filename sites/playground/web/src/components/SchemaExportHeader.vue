<script lang="ts" setup>
import type { IRendererSlotsProps } from '@opentiny/genui-sdk-vue';
import { IconDownload } from '@opentiny/vue-icon';
import { useExportVueCode } from '../hooks/use-generate-vue-code';
import { useGenerateAngularCode } from '../hooks/use-generate-angular-code';

const props = withDefaults(
  defineProps<
    Partial<IRendererSlotsProps> & {
      framework?: 'vue' | 'angular';
      content?: string | object;
      generating?: boolean;
    }
  >(),
  { framework: 'vue' },
);

const { exportVueCode } = useExportVueCode();
const { exportAngularCode } = useGenerateAngularCode();
const TinyIconDownload = IconDownload();

const isAngular = props.framework === 'angular';


const generating = isAngular ? (props.generating ?? false) : !props.isFinished;

const shouldShowExport = !generating && (isAngular || !props.isError);

const handleExport = () => {
  if (isAngular) {
    exportAngularCode(props.content ?? '');
  } else if (props.schema) {
    exportVueCode(props.schema);
  }
};
</script>

<template>
  <div :class="isAngular ? 'angular-card-wrapper' : 'renderer-header'">
    <slot v-if="isAngular" />
    <button
      v-if="shouldShowExport"
      type="button"
      class="schema-export-button"
      @click="handleExport"
    >
      <TinyIconDownload class="schema-export-icon" />
      <span class="schema-export-label">导出源码</span>
    </button>
  </div>
</template>

<style scoped>
.schema-export-button {
  display: inline-flex;
  align-items: center;
  gap: 0;
  height: 36px;
  padding: 10px;
  border: 0;
  border-radius: 18px;
  background: rgba(25, 25, 25, 0.08);
  color: var(--tv-color-text, #191919);
  cursor: pointer;
  opacity: 0;
  transform: translateY(-4px);
  pointer-events: none;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.schema-export-icon {
  width: 16px;
  height: 16px;
}

.schema-export-label {
  font-size: 12px;
  line-height: 1;
  white-space: nowrap;
  opacity: 0;
  max-width: 0;
  overflow: hidden;
  transition: opacity 0.15s ease, max-width 0.2s ease;
}

.angular-card-wrapper {
  position: relative;
}

.angular-card-wrapper .schema-export-button {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
}

.angular-card-wrapper:hover .schema-export-button {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.schema-export-button:hover {
  gap: 6px;
  background: rgba(25, 25, 25, 0.12);
}

.schema-export-button:hover .schema-export-label {
  opacity: 1;
  max-width: 80px;
}

.schema-export-button:active {
  transform: translateY(0) scale(0.98);
}
</style>
