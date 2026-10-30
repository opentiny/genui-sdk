<script setup lang="ts">
import { computed, inject } from 'vue';
import type { MergedMaterials } from '@opentiny/genui-sdk-core';
import ConfigProvider from '../config-provider/ConfigProvider.vue';
import type { I18nMessages } from '../chat/i18n';
import GenuiRenderer from '../renderer/GenuiRenderer.vue';
import { GENUI_BAKED_MATERIALS } from './materials-token';
import { parseBooleanAttribute, parseJsonAttribute } from './parse-attribute';
import { createUniqueId } from './unique-id';

defineOptions({
  shadowRoot: false,
});

const props = defineProps<{
  /** light | dark | auto（跟随系统） */
  theme?: string;
  /** 如 zh_CN、en_US */
  locale?: string;
  i18n?: string | Record<string, unknown>;
  // 必须声明成 prop：不声明会 fallthrough 覆盖内部容器的 :id，导致同一个 id 出现两次
  id?: string;

  // 渲染器的属性，声明在这里才能被 defineCustomElement 暴露成同名 attribute / property
  content?: string | Record<string, unknown>;
  generating?: boolean | string;
  isJsonComplete?: boolean | string;
  customComponents?: string | Record<string, unknown>;
  customActions?: string | Record<string, { execute: (params: unknown, context: unknown) => void }>;
  requiredCompleteFieldSelectors?: string | string[];
  state?: string | Record<string, unknown>;
}>();

const containerId = createUniqueId('genui-config-renderer');

// 由 createGenuiConfigRendererElement 的 configureApp 注入
const bakedMaterials = inject<MergedMaterials>(GENUI_BAKED_MATERIALS, {});

const parsedI18n = computed(() => parseJsonAttribute<I18nMessages>(props.i18n));

const parsedCustomComponents = computed(() => parseJsonAttribute<Record<string, unknown>>(props.customComponents));

const parsedCustomActions = computed(
  () =>
    parseJsonAttribute<Record<string, { execute: (params: unknown, context: unknown) => void }>>(props.customActions) ??
    {},
);

const parsedRequiredCompleteFieldSelectors = computed(() =>
  parseJsonAttribute<string[]>(props.requiredCompleteFieldSelectors),
);

const parsedState = computed(() => parseJsonAttribute<Record<string, unknown>>(props.state));

const isGenerating = computed(() => parseBooleanAttribute(props.generating));

const isJsonComplete = computed(() => parseBooleanAttribute(props.isJsonComplete));
</script>

<template>
  <ConfigProvider :id="containerId" :theme="theme" :locale="locale" :i18n="parsedI18n" :materials="bakedMaterials">
    <GenuiRenderer
      :content="content ?? '{}'"
      :generating="isGenerating"
      :is-json-complete="isJsonComplete"
      :custom-components="parsedCustomComponents"
      :custom-actions="parsedCustomActions"
      :required-complete-field-selectors="parsedRequiredCompleteFieldSelectors"
      :id="id"
      :state="parsedState"
    />
  </ConfigProvider>
</template>
