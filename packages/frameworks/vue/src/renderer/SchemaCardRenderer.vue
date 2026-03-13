<script setup lang="ts">
import { parsePartialJson } from 'ai';
import { ref, watch, computed, inject, nextTick, provide } from 'vue';
// @ts-ignore
import defaultSchemaRenderer, { Mapper, RENDERER_SETTINGS_KEY } from '@opentiny/tiny-schema-renderer';
import { DeltaPatcher } from '@opentiny/genui-sdk-core';
import { extendMapper } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/extend-renderer'; //TODO: 耦合
import { requiredCompleteFieldSelectors as internalRequiredCompleteFieldSelectors } from './config';
import { GENUI_RENDERER } from '../chat/injection-tokens';
import type { IRendererProps } from './renderer.types';
import { cardIdSymbol } from '../chat/useChat';
import { useI18n } from '../chat/i18n';
import * as TinyVue from '@opentiny/vue';
import TinyChartPie from '@opentiny/vue-chart-pie'
import TinyChartRadar from '@opentiny/vue-chart-radar'
import TinyChartBar from '@opentiny/vue-chart-bar'
import TinyChartHistogram from '@opentiny/vue-chart-histogram'
import TinyChartLine from '@opentiny/vue-chart-line'
import TinyChartRing from '@opentiny/vue-chart-ring'
import { TinyTabsWrap, TinySelectWrap } from '@opentiny/genui-sdk-materials-vue-opentiny-vue';

const props = defineProps<IRendererProps>();

const chartComponents = {
  TinyChartPie,
  TinyChartRadar,
  TinyChartBar,
  TinyChartHistogram,
  TinyChartLine,
  TinyChartRing,
}

const customComponents = {
  TinyTabs: TinyTabsWrap,
  TinySelect: TinySelectWrap,
}

provide(RENDERER_SETTINGS_KEY, {
  customComponentGetter: (name: string) => {
    return props.customComponents?.[name] || customComponents[name] || TinyVue[name] || chartComponents[name];
  }
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
