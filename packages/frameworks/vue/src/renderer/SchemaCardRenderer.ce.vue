<script setup lang="ts">
import { computed } from 'vue';
import SchemaCardRenderer from './SchemaCardRenderer.vue';

// Web Component 属性定义
const props = defineProps<{
  content?: string | { [prop: string]: any };
  generating?: boolean | string;
  customComponents?: string; // JSON string
  customActions?: string; // JSON string
  requiredCompleteFieldSelectors?: string; // JSON string
  id?: string;
  state?: string; // JSON string
}>();

// 解析字符串属性为对象，适配 Web Component 的属性传递
const parsedCustomComponents = computed(() => {
  if (!props.customComponents) return undefined;
  try {
    return JSON.parse(props.customComponents);
  } catch {
    return undefined;
  }
});

const parsedCustomActions = computed(() => {
  if (!props.customActions) return undefined;
  try {
    return JSON.parse(props.customActions);
  } catch {
    return undefined;
  }
});

const parsedRequiredCompleteFieldSelectors = computed(() => {
  if (!props.requiredCompleteFieldSelectors) return undefined;
  try {
    return JSON.parse(props.requiredCompleteFieldSelectors);
  } catch {
    return undefined;
  }
});

const parsedState = computed(() => {
  if (!props.state) return undefined;
  try {
    return JSON.parse(props.state);
  } catch {
    return undefined;
  }
});

const isGenerating = computed(() => {
  if (typeof props.generating === 'string') {
    return props.generating === 'true';
  }
  return props.generating || false;
});
</script>

<template>
  <SchemaCardRenderer
    :content="content"
    :generating="isGenerating"
    :custom-components="parsedCustomComponents"
    :custom-actions="parsedCustomActions"
    :required-complete-field-selectors="parsedRequiredCompleteFieldSelectors"
    :id="id"
    :state="parsedState"
  />
</template>
