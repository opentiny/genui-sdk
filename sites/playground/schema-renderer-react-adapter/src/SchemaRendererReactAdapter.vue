<template>
  <div ref="containerRef" class="schema-renderer-react-adapter"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, toRaw } from 'vue';
import { createRoot, type Root } from 'react-dom/client';
import React from 'react';
import { ReactHost, type ReactHostHandle, type ReactHostContentProps } from './ReactHost';

type CustomAction = {
  execute: (params: unknown, context: Record<string, unknown>) => unknown;
};

const props = defineProps<{
  schema: Record<string, unknown>;
  generating?: boolean;
  isJsonComplete?: boolean;
  customActions?: Record<string, CustomAction>;
  rendererId?: string;
  rendererState?: Record<string, unknown>;
}>();

const containerRef = ref<HTMLDivElement>();
let root: Root | null = null;
const hostHandleRef = { current: null as ReactHostHandle | null };
const pendingContext = ref<Record<string, unknown>>({});

function resolveIsJsonComplete() {
  if (props.generating) return false;
  return props.isJsonComplete ?? true;
}

function buildContentProps(): ReactHostContentProps | null {
  const schema = structuredClone(toRaw(props.schema)) as Record<string, unknown>;
  if (!schema?.componentName) return null;
  return {
    schema: schema as ReactHostContentProps['schema'],
    generating: props.generating,
    isJsonComplete: resolveIsJsonComplete(),
    customActions: props.customActions ? toRaw(props.customActions) : undefined,
    id: props.rendererId,
    state: props.rendererState,
  };
}

function flushPendingContext() {
  const handle = hostHandleRef.current;
  if (!handle || !Object.keys(pendingContext.value).length) return;
  handle.setContext({ ...pendingContext.value });
}

function onHostReady(handle: ReactHostHandle | null) {
  hostHandleRef.current = handle;
  if (handle) flushPendingContext();
}

function syncReactProps() {
  const next = buildContentProps();
  if (!next) return;
  if (hostHandleRef.current) {
    hostHandleRef.current.updateProps(next);
    flushPendingContext();
    return;
  }
  if (root) {
    root.render(
      React.createElement(ReactHost, {
        ref: onHostReady,
        initial: next,
      }),
    );
  }
}

onMounted(() => {
  if (containerRef.value) {
    root = createRoot(containerRef.value);
    syncReactProps();
  }
});

watch(() => props.schema, () => syncReactProps(), { deep: true, flush: 'post' });
watch(
  () => [props.generating, props.isJsonComplete, props.customActions, props.rendererId, props.rendererState],
  () => syncReactProps(),
  { deep: true },
);

onBeforeUnmount(() => {
  root?.unmount();
  root = null;
  hostHandleRef.current = null;
});

function setContext(ctx: Record<string, unknown>) {
  pendingContext.value = { ...pendingContext.value, ...ctx };
  flushPendingContext();
}
function getContext() {
  return hostHandleRef.current?.getRendererHandle()?.getContext() ?? {};
}
function setState(state: Record<string, unknown>) {
  hostHandleRef.current?.getRendererHandle()?.setState(state);
}

defineExpose({ setContext, getContext, setState });
</script>

<style scoped>
.schema-renderer-react-adapter {
  font-size: 14px;
  line-height: 1.5;
  color: #191919;
}
</style>
