# Renderer - Passing and Merging State

Use `state` to pass initial state to the renderer. It is merged into global state on init and accessible from component context.

## Passing State to the Component

State is merged when the component initializes and **does not update dynamically**.

### Use Case

`state` is mainly for **restoring history**: pass saved state from a past conversation so the renderer can rehydrate.

### Basic Usage

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
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
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={content} generating={generating} state={savedState} isJsonComplete />
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

<demo react="../../../../../demos/react/renderer/state.tsx" />

## Notes

1. **Merge on init**: State is only merged when the component initializes; later updates are ignored
2. **History restore**: Intended for rehydrating saved conversation state
3. **Serializable data**: Prefer plain data; avoid functions, DOM nodes, etc.
