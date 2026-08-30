<script lang="ts" setup>
import type { IRendererSlotsProps } from '@opentiny/genui-sdk-vue';
import { IconDownload } from '@opentiny/vue-icon';
import { useExportVueCode } from '../hooks/use-generate-vue-code';
import { useGenerateAngularCode } from '../hooks/use-generate-angular-code';

/**
 * 卡片「导出源码」按钮,同时服务 Vue / Angular 两种卡片:
 * - Vue 卡片(默认 framework="vue"):作为 rendererSlots.header 使用,
 *   经 slot scope 收到 schema/isError/isFinished,前端调 Vue 出码;
 * - Angular 卡片(framework="angular"):由 message-renderer-angular 作为渲染包装引用,
 *   通过 slot 投影卡片本体、组件根 wrapper 承担 hover 作用域,出码用 content/generating 调 Angular 出码。
 */
const props = withDefaults(
  defineProps<
    Partial<IRendererSlotsProps> & {
      /** 卡片渲染来源:'vue' 走 rendererSlots.header,'angular' 走自定义 renderer 包装 */
      framework?: 'vue' | 'angular';
      /** Angular 卡片的 schema(JSON 字符串或对象),来自 schemaCardProps.content */
      content?: string | object;
      /** Angular 卡片是否仍在生成(生成中不显示按钮) */
      generating?: boolean;
    }
  >(),
  { framework: 'vue' },
);

const { exportVueCode } = useExportVueCode();
const { exportAngularCode } = useGenerateAngularCode();
const TinyIconDownload = IconDownload();

const isAngular = props.framework === 'angular';

/** Angular:卡片完成(generating=false)即显示;Vue:isFinished 且无错误才显示 */
const shouldShowExport = isAngular
  ? !props.generating
  : Boolean(props.isFinished && !props.isError);

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

/* Angular 包装:组件作为渲染包装,根承担定位与 hover 作用域 */
.angular-card-wrapper {
  position: relative;
}

.angular-card-wrapper .schema-export-button {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 20;
}

/* 两级 hover:进入卡片显示图标,进入图标展开文字(Vue 卡片由 App.vue 提供同规则) */
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
