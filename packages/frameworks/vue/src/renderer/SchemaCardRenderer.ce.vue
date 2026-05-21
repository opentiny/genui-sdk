<script setup lang="ts">
import { computed, defineOptions } from 'vue';
import SchemaCardRenderer from './SchemaCardRenderer.vue';
import { parseBooleanAttribute, parseJsonAttribute } from '../web-component/parse-attribute';

defineOptions({
  shadowRoot: false,
});

const props = defineProps<{
  content?: string | Record<string, unknown>;
  generating?: boolean | string;
  isJsonComplete?: boolean | string;
  customComponents?: string; // JSON string
  customActions?: string; // JSON string
  requiredCompleteFieldSelectors?: string; // JSON string
  id?: string;
  state?: string; // JSON string
}>();

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
  <SchemaCardRenderer
    :content="content ?? '{}'"
    :generating="isGenerating"
    :is-json-complete="isJsonComplete"
    :custom-components="parsedCustomComponents"
    :custom-actions="parsedCustomActions"
    :required-complete-field-selectors="parsedRequiredCompleteFieldSelectors"
    :id="id"
    :state="parsedState"
  />
</template>
