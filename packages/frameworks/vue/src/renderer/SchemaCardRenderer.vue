<script setup lang="ts">
import { ref, watch, computed, inject, nextTick, onErrorCaptured } from 'vue';
// @ts-ignore
import defaultSchemaRenderer, { Mapper } from '@opentiny/tiny-schema-renderer';
import { DeltaPatcher, repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';
import { extendMapper } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/extend-renderer'; //TODO: 耦合
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';
import { requiredCompleteFieldSelectors as internalRequiredCompleteFieldSelectors } from './config';
import { GENUI_RENDERER } from '../chat/injection-tokens';
import type { IRendererProps } from './renderer.types';
import { cardIdSymbol } from '../chat/useChat';
import { useI18n } from '../chat/i18n';
import { iconDownload } from '@opentiny/vue-icon';
import { generateCode as generateVueCode } from './code-generator';

onErrorCaptured((error) => {
  console.error('GenuiRenderer error:', error);
  return true;
});

const props = defineProps<IRendererProps>();

extendMapper(Mapper, props.customComponents || {});

const schema = ref<any>({});
const rendererInstance = ref<defaultSchemaRenderer>(null);

const callAction = (actionName: string, params: any) => {
  if (!props.customActions[actionName]) {
    console.warn(`Action ${actionName} not found`);
  }
  props.customActions[actionName]?.execute(params, rendererInstance.value.getContext());
};

const SchemaRenderer = inject(GENUI_RENDERER, defaultSchemaRenderer);

const deltaPatcher = new DeltaPatcher({
  requiredCompleteFieldSelectors: [
    ...internalRequiredCompleteFieldSelectors,
    ...(props.requiredCompleteFieldSelectors || []),
  ],
});

const { t } = useI18n();

const TinyIconDownload = iconDownload();

const errorSchema = {
  componentName: 'Page',
  children: [
    {
      componentName: 'Text',
      props: {
        text: t('renderer.error.displayError'),
        style: 'line-height: 40px; color: var(--tv-color-error-text)',
      },
    },
  ],
};

const isError = ref(false);

const displaySchema = computed(() => {
  if (isError.value) {
    return errorSchema;
  }
  return schema.value;
});

let updateActionTimer: any | null = null;

function updateContextAndState() {
  rendererInstance.value?.setContext({
    callAction
  })
  rendererInstance.value?.setContext({
    [cardIdSymbol]: props.id,
  })
  rendererInstance.value?.setState(props.state || {});
}

const generateComponentsMap = (materialsList) => {
  if (!Array.isArray(materialsList)) {
    return [];
  }

  const deduped = new Map();

  materialsList.forEach((material) => {
    const components = material?.data?.materials?.components;
    if (!Array.isArray(components)) {
      return;
    }

    components.forEach((item) => {
      const componentName = item?.component || item?.npm?.exportName;
      const pkg = item?.npm?.package;
      if (!componentName || !pkg) {
        return;
      }

      // 兼容现有生成器字段（package）以及外部约定字段（pkg）
      deduped.set(componentName, {
        componentName,
        pkg,
        package: pkg,
        exportName: item?.npm?.exportName || componentName,
      });
    });
  });

  return [...deduped.values()];
};

const { materialsList } = rendererConfig;
const componentsMap = generateComponentsMap(materialsList);

/** 将文本保存为本地文件并触发浏览器下载 */
const downloadTextFile = (filename, text) => {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = /\.vue$/i.test(filename) ? filename : `${filename}.vue`;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

const generateCode = async () => {
  const { panelValue: code, panelName: fileName, errors, prettierOpts } = generateVueCode({
    pageInfo: { schema: displaySchema.value },
    componentsMap,
  });

  // 优先支持下载：即使校验有错误，也尽量导出原始结果。
  if (errors?.length) {
    console.error('生成代码校验出错：', errors);
  }

  downloadTextFile(fileName, code);
};

watch(
  () => props.content,
  (newVal) => {
    isError.value = false;
    let json: any = newVal;
    let isCompleted = true
    if (typeof newVal === 'string') {
      if (newVal.trim()) {
        const { value, state } = repairJson(newVal);
        if (!value || typeof value !== 'object') {
          isError.value = true;
          return;
        }
        json = value;
        isCompleted = state === RepairJsonState.SUCCESS
      } else {
        json = {};
      }
    }
    deltaPatcher.patchWithDelta(schema.value, json, isCompleted); // TODO： 速率限制
    if (!updateActionTimer) {
      updateActionTimer = nextTick(() => {
        if (!rendererInstance.value) return;
        updateContextAndState();
        updateActionTimer = null;
      })
    }
  },
  {
    immediate: true,
  },
);
// 异步组件可能在更新context时候并未ready，导致恢复会话的时候context没更新
watch(() => rendererInstance.value, (newVal) => {
  if (newVal && updateActionTimer) {
    nextTick(() => updateContextAndState());
    updateActionTimer = null;
  }
}, {
  immediate: true,
});
</script>

<template>
  <div class="schema-render-container">
    <slot name="header" :schema="schema" :isError="isError" :isFinished="!props.generating"></slot>
    <div class="schema-card-renderer-container">
      <!-- 图标：下载
           - 鼠标悬浮到容器：显示下载按钮
           - 鼠标悬浮到按钮：显示“导出源码”文案
        -->
      <div class="schema-export-button" @click.stop.prevent="generateCode">
        <TinyIconDownload class="schema-export-icon" />
        <span class="schema-export-label">导出源码</span>
      </div>

      <SchemaRenderer :schema="displaySchema" ref="rendererInstance" />
      <slot name="footer" :schema="schema" :isError="isError" :isFinished="!props.generating"></slot>
    </div>
  </div>
</template>

<style scoped lang="less">
@import url('./custom.css');

.schema-render-container {
  position: relative;
  color: var(--tv-color-text, #191919);
}

.schema-render-container:has(.loading-warp):after {
  display: none;
}

:deep(.loading-warp.loading-warp) {
  display: none;
}

:deep(.loading-warp .loading) {
  display: none;
}

.schema-card-renderer-container {
  position: relative;

  &:hover {
    .schema-export-button {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }
  }

  .schema-export-button {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 2;

    display: inline-flex;
    align-items: center;
    gap: 0;

    padding: 10px;
    border: 0;
    border-radius: 38px;
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

  .schema-export-button:hover {
    gap: 6px;
  }

  .schema-export-button:hover .schema-export-label {
    opacity: 1;
    max-width: 80px;
  }

  .schema-export-button:active {
    transform: translateY(0) scale(0.98);
  }
}
</style>
