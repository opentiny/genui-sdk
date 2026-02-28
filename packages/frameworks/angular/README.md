# @opentiny/genui-sdk-angular

An Angular component library for enhanced LLM display and interaction. Stream AI-generated structured output into OpenTiny interactive UI components with bidirectional conversation support.

* **Streaming Rendering:** Content renders progressively as the model generates—no long waits for full responses.
* **Structured Output:** LLM output conforms to JSON Schema, enabling reliable parsing and rendering.
* **Interaction:** User actions (form submit, button click) feed back into the conversation context for seamless multi-turn flows.

[Learn more about GenUI SDK](https://opentiny.design/genui-sdk).

## Usage

```typescript
// app.component.ts
import { Component } from '@angular/core';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';

@Component({
  standalone: true,
  imports: [GenuiRenderer],
  template: `
    <genui-renderer
      [content]="schemaContent"
      [state]="state"
      [generating]="isGenerating"
    />
  `,
})
export class AppComponent {
  schemaContent = '{}';
  state: Record<string, any> = {};
  isGenerating = false;
}
```

## Documentation

* [start-with-render](https://docs.opentiny.design/genui-sdk/guide/angular/start-with-renderer)

## API

* [GenuiRenderer](https://docs.opentiny.design/genui-sdk/components/angular/renderer)
