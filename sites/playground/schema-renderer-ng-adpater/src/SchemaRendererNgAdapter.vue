<template>
  <genui-renderer-ng-element v-bind="props"></genui-renderer-ng-element>
</template>

<script setup lang="ts">
import '@opentiny/genui-sdk-angular/dist/renderer-element/browser/polyfills.js';
import '@opentiny/genui-sdk-angular/dist/renderer-element/browser/main.js';
import '@opentiny/genui-sdk-angular/dist/renderer-element/browser/styles.css';
const props = defineProps<{
  id?: string;
  state?: Record<string, any>;
  generating: boolean;
  content: string | object;
  customDirectives?: Record<string, any>;
  customComponents?: Record<string, any>;
  customComponentsModule?: Record<string, any>;
  customActions?: Record<string, any>;
  requiredCompleteFieldSelectors?: string[];
}>();
</script>
