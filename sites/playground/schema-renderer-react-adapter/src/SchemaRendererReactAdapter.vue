<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, toRaw } from 'vue';
import { createRoot, type Root } from 'react-dom/client';
import React from 'react';
import type { ReactHostHandle, ReactHostContentProps } from './ReactHost.types';

type CustomAction = {
  execute: (params: unknown, context: Record<string, unknown>) => unknown;
};

type ReactHostComponent = React.ForwardRefExoticComponent<
  { initial: ReactHostContentProps } & React.RefAttributes<ReactHostHandle>
>;

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
let ReactHost: ReactHostComponent | null = null;
const hostHandleRef = { current: null as ReactHostHandle | null };
const pendingContext = ref<Record<string, unknown>>({});

async function ensureReactHost() {
  if (!ReactHost) {
    ({ ReactHost } = await import('./ReactHost'));
  }
  return ReactHost;
}

function resolveIsJsonComplete() {
  if (props.generating) return false;
  return props.isJsonComplete ?? true;
}

function buildContentProps(): ReactHostContentProps | null {
  const schema = structuredClone(toRaw(props.schema)) as Record<string, unknown>;
  if (!schema?.componentName) return null;
  return {
    content: schema,
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
  pendingContext.value = {};
}

function onHostReady(handle: ReactHostHandle | null) {
  hostHandleRef.current = handle;
  if (handle) flushPendingContext();
}

async function syncReactProps() {
  const next = buildContentProps();
  if (!next) return;
  if (hostHandleRef.current) {
    hostHandleRef.current.updateProps(next);
    flushPendingContext();
    return;
  }
  const Host = await ensureReactHost();
  if (root && Host) {
    root.render(
      React.createElement(Host, {
        ref: onHostReady,
        initial: next,
      }),
    );
  }
}

onMounted(async () => {
  if (containerRef.value) {
    root = createRoot(containerRef.value);
    await syncReactProps();
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
  ReactHost = null;
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

<template>
  <div ref="containerRef" class="schema-renderer-react-adapter"></div>
</template>

<style scoped>
.schema-renderer-react-adapter {
  font-size: 14px;
  line-height: 1.5;
  color: #191919;
}
</style>
