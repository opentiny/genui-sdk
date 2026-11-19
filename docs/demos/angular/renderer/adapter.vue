<template>
  <genui-renderer-ng-element v-if="mounted" ref="rendererRef" v-bind="elementProps"></genui-renderer-ng-element>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref, watch } from 'vue';
import '@opentiny/genui-sdk-angular/dist/renderer-element/browser/polyfills.js';
import '@opentiny/genui-sdk-angular/dist/renderer-element/browser/main.js';
import '@opentiny/genui-sdk-angular/dist/renderer-element/browser/styles.css';

const ELEMENT_TAG = 'genui-renderer-ng-element';

type GenuiRendererElement = HTMLElement & {
  getState?: () => Record<string, any>;
  setState?: (state?: Record<string, any>) => void;
};

const props = defineProps<{
  state?: Record<string, any>;
  generating: boolean;
  content: string | object;
  customDirectives?: Record<string, any>;
  customComponents?: Record<string, any>;
  customComponentsModule?: Record<string, any>;
  customActions?: Record<string, any>;
  requiredCompleteFieldSelectors?: string[];
}>();

const rendererRef = ref<GenuiRendererElement | null>(null);
const elementProps = computed(() => {
  const { state: _state, ...rest } = props;
  return rest;
});

// 状态通过元素上的 setState 注入，不再作为 @Input 传递
function applyState() {
  customElements.whenDefined(ELEMENT_TAG).then(() => {
    rendererRef.value?.setState?.(props.state || {});
  });
}

watch(rendererRef, (element) => {
  if (element) {
    applyState();
  }
});
watch(() => props.state, () => applyState(), { deep: true });

/**
 * Vue keep-alive detaches the tree → CE disconnectedCallback → Angular Elements
 * destroy() removes the host node from its Vue parent (nativeRemoveNode on the
 * component host). After that `genui-renderer-ng-element` is gone from the DOM,
 * while Vue still holds the orphaned vnode and will not recreate it on activate.
 *
 * Unmount on deactivate / remount on activate so Vue creates a fresh CE and
 * re-binds props.
 */
const mounted = ref(true);

onDeactivated(() => {
  mounted.value = false;
});

onActivated(() => {
  mounted.value = true;
});
</script>
