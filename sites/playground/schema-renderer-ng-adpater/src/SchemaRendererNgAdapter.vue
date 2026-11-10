<template>
  <genui-renderer-ng-element v-if="mounted" ref="rendererRef" v-bind="elementProps"></genui-renderer-ng-element>
</template>

<script setup lang="ts">
import { computed, onActivated, onDeactivated, ref, watch } from 'vue';
import '@opentiny/genui-sdk-angular/dist/renderer-element/browser/polyfills.js';
import '@opentiny/genui-sdk-angular/dist/renderer-element/browser/main.js';
import '@opentiny/genui-sdk-angular/dist/renderer-element/browser/styles.css';

type GenuiRendererElement = HTMLElement & {
  getState?: () => Record<string, any>;
  setState?: (state?: Record<string, any>) => void;
};

const props = defineProps<{
  rendererState?: Record<string, any>;
  generating: boolean;
  content: string | object;
  customDirectives?: Record<string, any>;
  customComponents?: Record<string, any>;
  customComponentsModule?: Record<string, any>;
  customActions?: Record<string, any>;
  requiredCompleteFieldSelectors?: string[];
}>();

const rendererRef = ref<GenuiRendererElement | null>(null);

/** rendererState 不参与属性透传，改为挂载后通过元素方法设置 */
const elementProps = computed(() => {
  const { rendererState: _rendererState, ...inputs } = props;
  return inputs;
});

function applyRendererState() {
  rendererRef.value?.setState?.(props.rendererState || {});
}

// 元素挂载 / keep-alive 重新激活（元素会重建）后回填状态
watch(
  rendererRef,
  (element) => {
    if (element) {
      applyRendererState();
    }
  },
  { flush: 'post' },
);

watch(
  () => props.rendererState,
  () => applyRendererState(),
  { deep: true },
);

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
