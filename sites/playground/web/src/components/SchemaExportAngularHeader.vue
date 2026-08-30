<script lang="ts" setup>
import { IconDownload } from '@opentiny/vue-icon';
import { useGenerateAngularCode } from '../hooks/use-generate-angular-code';

const props = defineProps<{
  content: string | object;
  generating?: boolean;
}>();

const { exportAngularCode } = useGenerateAngularCode();
const TinyIconDownload = IconDownload();
</script>

<template>
  <!-- wrapper 包住整个卡片(slot 投影),hover 整卡触发按钮显隐,与 Vue 卡片交互一致 -->
  <div class="angular-card-wrapper">
    <slot />
    <div class="angular-card-actions">
      <button
        v-if="!props.generating"
        type="button"
        class="schema-export-button"
        @click="exportAngularCode(props.content)"
      >
        <TinyIconDownload class="schema-export-icon" />
        <span class="schema-export-label">导出源码</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.angular-card-wrapper {
  position: relative;
}

.angular-card-actions {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
}

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

/* 第一级:进入卡片 → 仅显示图标 */
.angular-card-wrapper:hover .schema-export-button {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* 第二级:进入图标(按钮)→ 展开文字 + 背景加深,与 Vue 卡片交互一致 */
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
