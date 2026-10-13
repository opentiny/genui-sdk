# @opentiny/genui-sdk-angular


An Angular component library for enhanced LLM display and interaction. Stream AI-generated structured output into OpenTiny interactive UI components with bidirectional conversation support.

* **Streaming Rendering:** Content renders progressively as the model generates—no long waits for full responses.
* **Structured Output:** LLM output conforms to JSON Schema, enabling reliable parsing and rendering.
* **Interaction:** User actions (form submit, button click) feed back into the conversation context for seamless multi-turn flows.

[Learn more about GenUI SDK](https://opentiny.design/genui-sdk).

## Usage

```typescript
import { Component } from '@angular/core';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

@Component({
  standalone: true,
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="materials">
      <genui-renderer
        [content]="schemaContent"
        [state]="state"
        [generating]="isGenerating"
      />
    </genui-config-provider>
  `,
})
export class AppComponent {
  materials = materials;
  schemaContent = '{}';
  state: Record<string, any> = {};
  isGenerating = false;
}
```

For drop-in compatibility with built-in materials, use `GenuiLegacyRenderer` instead of wrapping `GenuiRenderer` with `GenuiConfigProvider`.

## Documentation

* [start-with-render](https://docs.opentiny.design/genui-sdk/guide/angular/start-with-renderer)

## API

* [GenuiRenderer](https://docs.opentiny.design/genui-sdk/components/angular/renderer)
