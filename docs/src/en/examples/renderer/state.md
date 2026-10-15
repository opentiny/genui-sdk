# Renderer - Passing and Merging State

Use the instance method `setState` to inject state into the renderer. It is merged into global state and accessible from component context.

## Passing State to the Renderer

`setState` injects state with a shallow merge. It only injects into the current runtime and stores nothing, so in streaming scenarios a schema state update wipes out the state previously set by `setState`. You therefore need to control when `setState` is called while streaming.

### Use Case

`setState` is mainly for **restoring history**: pass saved state from a past conversation so the renderer can rehydrate.

### Basic Usage

```vue {14,24-27}
<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiRenderer ref="rendererRef" :content="content" :generating="generating" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { onMounted, ref } from 'vue';
import { GenuiConfigProvider, GenuiRenderer, type IRendererExpose } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({});
const rendererRef = ref<IRendererExpose | null>(null);

// State restored from history
const savedState = {
  formData: {
    name: 'John Doe',
    age: 30,
  },
};

// Inject state after mount, when the renderer instance is ready
onMounted(() => {
  rendererRef.value?.setState(savedState);
});
</script>
```

### Accessing State in Actions

In custom actions, use `context.state`:

```vue
<script setup lang="ts">
const customActions = {
  getState: {
    execute: (params: any, context: Record<string, any>) => {
      const state = context.state;
      alert(`Global state: ${JSON.stringify(state)}`);
    },
  },
};
</script>
```

#### Full Example

<demo vue="../../../../demos/en/renderer/state.vue" />

## Notes

1. **Merged updates**: `setState` merges into existing state by default; pass `true` as the second argument to replace it.
2. **Streaming updates**: Every schema update resets the state from the schema, so re-call `setState` after an update if the state must be kept.
3. **History replay**: Intended for restoring saved conversation state.
4. **Serializable data**: Avoid functions, DOM nodes, and other non-serializable values.
