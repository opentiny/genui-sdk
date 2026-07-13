# Renderer - Passing and Merging State

Use `state` to pass initial state to the renderer. It is merged into global state on init and accessible from component context.

## Passing State to the Renderer

State is merged when `GenuiRenderer` initializes and **does not update dynamically**.

### Use Case

`state` is mainly for **restoring history**: pass saved state from a past conversation so the renderer can rehydrate.

### Basic Usage

```vue {12-18}
<template>
  <GenuiRenderer :content="content" :generating="generating" :state="savedState" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({});

const savedState = {
  formData: {
    name: 'John Doe',
    age: 30,
  },
};
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

1. **Init-only merge**: State is merged only on init; later updates are ignored.
2. **History replay**: Intended for restoring saved conversation state.
3. **Serializable data**: Avoid functions, DOM nodes, and other non-serializable values.
