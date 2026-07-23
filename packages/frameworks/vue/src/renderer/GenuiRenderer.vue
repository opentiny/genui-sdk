<script setup lang="ts">
import { ref, watch, computed, inject, nextTick, onErrorCaptured, provide, shallowRef } from 'vue';
// @ts-ignore
import SchemaRenderer, { RENDERER_SETTINGS_KEY } from '@opentiny/tiny-schema-renderer';
import { DeltaPatcher, repairJson, RepairJsonState, type IMaterials } from '@opentiny/genui-sdk-core';
import { requiredCompleteFieldSelectors as internalRequiredCompleteFieldSelectors } from './config';
import { GENUI_MATERIALS } from '../config-provider/injection-tokens';
import type { IRendererProps } from './renderer.types';
import { cardIdSymbol } from '../chat/useChat';
import { useI18n } from '../chat/i18n';

onErrorCaptured((error) => {
  console.error('GenuiRenderer error:', error);
  return true;
});

const props = withDefaults(defineProps<IRendererProps>(), {
  isJsonComplete: true,
});

const schema = ref<any>({});
const rendererInstance = ref<SchemaRenderer | null>(null);

const callAction = (actionName: string, params: any) => {
  if (!props.customActions?.[actionName]) {
    console.warn(`Action ${actionName} not found`);
    return;
  }
  return props.customActions[actionName]?.execute(params, rendererInstance.value.getContext());
};

const materials = inject<IMaterials>(GENUI_MATERIALS, {});
const customSettings = inject(RENDERER_SETTINGS_KEY, {});

watch(() => props.customComponents, (newVal) => {
  // TODO:  1、materials.components更新后，customComponents会丢失 2、旧的customComponents没有被移除
  if (materials.components) {
    Object.assign(materials.components, newVal);
  }
}, { immediate: true });

provide(RENDERER_SETTINGS_KEY, {
  ...customSettings,
  materials: materials.components || {},
  defaultPropsMap: materials.defaultPropsMap,
});

const deltaPatcher = shallowRef(null);

watch(
  () => [materials?.requiredCompleteFieldSelectors, props.requiredCompleteFieldSelectors],
  () => {
    deltaPatcher.value = new DeltaPatcher({
      requiredCompleteFieldSelectors: [
        ...internalRequiredCompleteFieldSelectors,
        ...(materials?.requiredCompleteFieldSelectors || []),
        ...(props.requiredCompleteFieldSelectors || []),
      ],
    });
  },
  { immediate: true },
);

const { t } = useI18n();

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
    callAction,
  });
  rendererInstance.value?.setContext({
    [cardIdSymbol]: props.id,
  });
  rendererInstance.value?.setState(props.state || {});
}

watch(
  [() => props.content, () => props.isJsonComplete],
  ([newVal, isJsonComplete]) => {
    isError.value = false;
    let json: any = newVal;
    let isCompleted = true;
    if (typeof newVal === 'string') {
      if (newVal.trim()) {
        const { value, state } = repairJson(newVal);
        if (!value || typeof value !== 'object') {
          isError.value = true;
          return;
        }
        json = value;
        isCompleted = state === RepairJsonState.SUCCESS;
      } else {
        json = {};
      }
    } else {
      isCompleted = isJsonComplete ?? true;
    }
    if (!isCompleted && json && 'lifeCycles' in json) {
      const { lifeCycles, ...rest } = json;
      json = rest;
    }
    deltaPatcher.value.patchWithDelta(schema.value, json, isCompleted); // TODO： 速率限制
    if (!updateActionTimer) {
      updateActionTimer = nextTick(() => {
        if (!rendererInstance.value) return;
        updateContextAndState();
        updateActionTimer = null;
      });
    }
  },
  {
    immediate: true,
  },
);
// 异步组件可能在更新context时候并未ready，导致恢复会话的时候context没更新
watch(
  () => rendererInstance.value,
  (newVal) => {
    if (newVal && updateActionTimer) {
      nextTick(() => updateContextAndState());
      updateActionTimer = null;
    }
  },
  {
    immediate: true,
  },
);
</script>

<template>
  <div class="schema-render-container">
    <slot name="header" :schema="schema" :isError="isError" :isFinished="!props.generating"></slot>
    <SchemaRenderer :schema="displaySchema" ref="rendererInstance" />
    <slot name="footer" :schema="schema" :isError="isError" :isFinished="!props.generating"></slot>
  </div>
</template>

<style scoped>
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
</style>
