# Renderer - Passing and Merging State

Use the instance method `setState` to inject state into the renderer. It is merged into global state and accessible from component context.

## Injecting State into the Component

`setState` performs a shallow merge into existing state. It only injects into the current runtime and stores nothing, so in streaming scenarios a schema state update wipes out the state previously set by `setState`. You therefore need to control when `setState` is called while streaming.

### Use Case

`setState` is mainly for **restoring history**: pass saved state from a past conversation so the renderer can rehydrate.

### Basic Usage

```tsx
import { useEffect, useRef } from 'react';
import { GenuiConfigProvider, GenuiRenderer, type IRendererExpose } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const generating = false;
const content = {};

// State restored from history
const savedState = {
  formData: {
    name: 'John Doe',
    age: 30,
  },
};

export default function Example() {
  const rendererRef = useRef<IRendererExpose | null>(null);

  // Inject state after mount, when the renderer instance is ready
  useEffect(() => {
    rendererRef.current?.setState(savedState);
  }, []);

  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer ref={rendererRef} content={content} generating={generating} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

### Accessing State in Actions

In a custom Action, read state via `context.state`:

```tsx
const customActions = {
  getState: {
    execute: (params: unknown, context: Record<string, unknown>) => {
      const state = context.state;
      alert(`Global state: ${JSON.stringify(state)}`);
    },
  },
};
```

#### Full example:

<demo react="../../../../../demos/en/react/renderer/state.tsx" />

## Notes

1. **Merged updates**: `setState` shallow-merges into existing state; fields you do not pass are preserved.
2. **Streaming updates**: Every schema update resets the state from the schema, so re-call `setState` after an update if the state must be kept.
3. **History restore**: Intended for rehydrating saved conversation state.
4. **Serializable data**: Prefer plain data; avoid functions, DOM nodes, etc.
