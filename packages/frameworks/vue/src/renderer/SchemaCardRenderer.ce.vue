<script setup lang="ts">
import { computed } from 'vue';
import SchemaCardRenderer from './SchemaCardRenderer.vue';
import { parseBooleanAttribute, parseJsonAttribute } from '../web-component/parse-attribute';

defineOptions({
  shadowRoot: false,
});

const props = defineProps<{
  content?: string | Record<string, unknown>;
  generating?: boolean | string;
  isJsonComplete?: boolean | string;
  customComponents?: string | Record<string, unknown>; // JSON string
  customActions?: string | Record<string, { execute: (params: unknown, context: unknown) => void }>; // JSON string
  requiredCompleteFieldSelectors?: string | string[]; // JSON string
  id?: string;
  state?: string | Record<string, unknown>; // JSON string
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
