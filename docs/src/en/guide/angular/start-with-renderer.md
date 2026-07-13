# Using the Renderer Component

The core renderer component `GenuiRenderer` lets you compose logic more freely and control flows with finer granularity. This section shows a **minimal working example**: use the browser's native `fetch` to make a **streaming request**, then pass the streamed schema fragments to `GenuiRenderer` for rendering.

## Fetch the service and handle streaming responses

Create a file `fetch-schema-stream.ts`. The logic inside is based on the OpenAI-compatible format:

````ts {14-18}
// fetch-schema-stream.ts
export async function fetchSchemaStream(
  url: string,
  userInput: string,
  onSchemaUpdate: (schemaChunk: string) => void,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: userInput }],
      model: 'deepseek-v3.2',
      stream: true,
      metadata: {
        tinygenui: JSON.stringify({
          framework: 'Angular'
        }),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  let inSchemaStream = false;
  let bufferText = '';
  let schemaFinished = false;
  const startFlag = '```schemaJson';
  const endFlag = '```';

  // Detect schema start marker
  const isSchemaJsonStart = (str: string): boolean => {
    const index = str.indexOf('`');
    if (index === -1) return false;
    return startFlag.startsWith(str.substring(index, index + startFlag.length));
  };

  // Detect schema end marker
  const isSchemaJsonEnd = (str: string): boolean => {
    const index = str.lastIndexOf('\n');
    if (index === -1) return false;
    if (str.includes(`\n${endFlag}`)) {
      return true;
    }
    const newStr = str.slice(index).trim().substring(0, endFlag.length);
    return endFlag.startsWith(newStr);
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const lineEndIndex = buffer.indexOf('\n');
        if (lineEndIndex === -1) break;

        const line = buffer.slice(0, lineEndIndex).trim();
        buffer = buffer.slice(lineEndIndex + 1);

        if (!line.startsWith('data: ')) continue;

        const dataStr = line.slice(6);

        if (dataStr === '[DONE]' || schemaFinished) {
          return;
        }

        try {
          const chunk = JSON.parse(dataStr);
          const content = chunk.choices?.[0]?.delta?.content;

          if (!content) continue;

          const deltaPart = bufferText + content;

          // Detect entering or exiting the schema stream
          if ((!inSchemaStream && isSchemaJsonStart(deltaPart)) || (inSchemaStream && isSchemaJsonEnd(deltaPart))) {
            const matchFlag = inSchemaStream ? /(\n\s*)```/ : startFlag;
            const matchPart = deltaPart.match(matchFlag)?.[0];

            if (!matchPart) {
              // Incomplete marker; keep for next chunk
              bufferText = deltaPart;
              continue;
            }

            if (inSchemaStream) {
              const trimmedDelta = deltaPart.trim();
              const [schemaPart] = trimmedDelta.split(matchPart);
              if (schemaPart) {
                onSchemaUpdate(schemaPart);
              }
              schemaFinished = true;
              return;
            } else {
              const trimmedDelta = deltaPart.trim();
              const [, schemaPart] = trimmedDelta.split(matchPart);
              inSchemaStream = true;
              bufferText = '';
              if (schemaPart) {
                onSchemaUpdate(schemaPart);
              }
              continue;
            }
          }

          bufferText = '';
          if (inSchemaStream) {
            onSchemaUpdate(deltaPart);
          }
        } catch (e) {
          console.error('Failed to parse backend data:', e, dataStr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
````

## Use the Renderer component to accept streamed schemaJson

Create a simple component with an input, send button, and render area. Configure an LLM service that can generate `schemaJson`:

```ts {8, 15,61-63}
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { fetchSchemaStream } from '../fetch-schema-stream';

@Component({
  selector: 'genui-example',
  imports: [FormsModule, GenuiRenderer],
  template: `
  <div class="demo-container">
    <div class="input-group">
      <input [(ngModel)]="inputText" type="text" placeholder="Enter your question..." (keyup.enter)="handleSend()" />
      <button (click)="handleSend()">Send</button>
    </div>
    <genui-renderer [content]="schema"> </genui-renderer>
  </div>
  `,
  styles: [`
.demo-container {
  padding: 16px;
  box-sizing: border-box;
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
  `],
})
export class GenuiExample {
  inputText = '';
  schema = '';
  rendererKey = '';
  generating = false;
  async handleSend() {
    if (!this.inputText.trim() || this.generating) return;

    this.generating = true;
    this.schema = '';
    const userInput = this.inputText;
    this.inputText = '';

    try {
      await fetchSchemaStream('https://<your-backend-api>/chat/completions', userInput, (schemaChunk: string) => {
        this.schema += schemaChunk;
      });
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      this.generating = false;
    }
  }
  handlePrint(schema: any) {
    console.log(schema);
  }
}

```

## Try it now

Sample output:

![Renderer component example](../../../public/start-with-renderer-ng.png)

## Related documentation

- See the [Renderer component docs](../../components/angular/renderer) for the full API
- See [custom actions example](../../examples/angular/renderer/custom-actions) to learn how to create custom actions
