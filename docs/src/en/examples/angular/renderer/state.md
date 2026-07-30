# Renderer - Passing and Merging State

Use `state` to pass initial state to the renderer. It is merged into global state on init and accessible from component context.

## Passing State to the Component

State is merged when the component initializes and **does not update dynamically**.

### Use Case

`state` is mainly for **restoring history**: pass saved state from a past conversation so the renderer can rehydrate.

### Basic Usage

```ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="content" [generating]="generating" [state]="savedState" />
  `,
})
export class GenuiExample {
  generating = false;
  content = {};

  // State restored from history
  savedState = {
    formData: {
      name: 'John Doe',
      age: 30,
    },
  };
}
```

### Accessing State in Actions

In custom actions, use `context.state`:

```ts
const customActions = {
  getState: {
    execute: (params: any, context: Record<string, any>) => {
      const state = context.state;
      alert(`Global state: ${JSON.stringify(state)}`);
    },
  },
};
```

#### Full Example

<demo vue="../../../../../demos/en/angular/renderer/state.vue" :vueFiles="['../../../../../demos/angular/renderer/state.ts']"/>

## Notes

1. **Init-only merge**: State is merged only on init; later updates are ignored.
2. **History replay**: Intended for restoring saved conversation state.
3. **Serializable data**: Avoid functions, DOM nodes, and other non-serializable values.
