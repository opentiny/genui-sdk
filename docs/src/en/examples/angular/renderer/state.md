# Renderer - Passing and Merging State

Use the instance method `setState` to inject state into the renderer. It is merged into global state and accessible from component context.

## Injecting State into the Component

`setState` performs a shallow merge into existing state. It only injects into the current runtime and stores nothing, so in streaming scenarios a schema state update wipes out the state previously set by `setState`. You therefore need to control when `setState` is called while streaming.

### Use Case

`setState` is mainly for **restoring history**: pass saved state from a past conversation so the renderer can rehydrate.

### Basic Usage

```ts
import { AfterViewInit, Component, ViewChild } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  imports: [GenuiRenderer],
  template: `
    <genui-renderer [content]="content" [generating]="generating" />
  `,
})
export class GenuiExample implements AfterViewInit {
  @ViewChild(GenuiRenderer) renderer!: GenuiRenderer;

  generating = false;
  content = {};

  // State restored from history
  savedState = {
    formData: {
      name: 'John Doe',
      age: 30,
    },
  };

  // Inject state after view init, when the renderer instance is ready
  ngAfterViewInit() {
    this.renderer.setState(this.savedState);
  }
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

1. **Merged updates**: `setState` shallow-merges into existing state; fields you do not pass are preserved.
2. **Streaming updates**: Every schema update resets the state from the schema, so re-call `setState` after an update if the state must be kept.
3. **History replay**: Intended for restoring saved conversation state.
4. **Serializable data**: Avoid functions, DOM nodes, and other non-serializable values.
