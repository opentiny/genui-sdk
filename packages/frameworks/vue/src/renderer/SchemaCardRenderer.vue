<script setup lang="ts">
import { parsePartialJson } from 'ai';
import { ref, watch, computed, inject, nextTick } from 'vue';
// @ts-ignore
import defaultSchemaRenderer from '@opentiny/tiny-schema-renderer';
import { DeltaPatcher } from '@opentiny/genui-sdk-core';
import { requiredCompleteFieldSelectors as internalRequiredCompleteFieldSelectors } from './config';
import { GENUI_RENDERER } from '../chat/injection-tokens';
import type { IRendererProps, MaterialRegistry } from './renderer.types';
import { cardIdSymbol } from '../chat/useChat';
import { useI18n } from '../chat/i18n';

const props = defineProps<IRendererProps>();

const mergedMaterialRegistry = computed<MaterialRegistry | null>(() => {
  const base = props.materialRegistry;
  const custom = props.customComponents;
  if (!custom || !Object.keys(custom).length) {
    return base ?? null;
  }
  if (!base) {
    return {
      resolveComponent(name: string) {
        return custom[name] ?? null;
      },
    };
  }
  return {
    resolveComponent(name: string) {
      const c = custom[name];
      if (c) return c;
      return base.resolveComponent(name);
    },
  };
});

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

watch(
  () => props.content,
  async (newVal) => {
    let json: any = newVal;
    let isCompleted = true
    if (typeof newVal === 'string') {
      if (newVal.trim()) {
        const { value, state } = await parsePartialJson(newVal);
        if (!value) {
          isError.value = true;
          return;
        }
        json = value;
        isCompleted = state === 'successful-parse'
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
    <SchemaRenderer :schema="displaySchema" :material-registry="mergedMaterialRegistry || undefined" ref="rendererInstance" />
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
