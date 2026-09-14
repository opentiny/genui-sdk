# Using the Renderer Component

The core renderer component `GenuiRenderer` lets you compose logic more freely and control flows with finer granularity. This section shows a **minimal working example**: use the browser's native `fetch` to make a **streaming request**, then pass the streamed schema fragments to `GenuiRenderer` for rendering.

## Fetch the service and handle streaming responses

Create a file `fetch-schema-stream.ts`. Parse OpenAI-compatible SSE `delta.content`, then use core `PatternExtractor` to extract `` ```schemaJson `` chunks (default `SchemaJsonPattern`):

````ts
// fetch-schema-stream.ts
import { PatternExtractor } from '@opentiny/genui-sdk-core';

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
          framework: 'React',
        }),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const patternExtractor = new PatternExtractor({
    onNormalWrite: () => {},
    onHandledWrite: (value) => onSchemaUpdate(value),
  });

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

        if (dataStr === '[DONE]') {
          return;
        }

        try {
          const chunk = JSON.parse(dataStr);
          const content = chunk.choices?.[0]?.delta?.content;

          if (!content) continue;

          patternExtractor.handleContent(content);
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

Create a simple React component with an input, send button, and render area. Configure an LLM service that can generate `schemaJson`:

```tsx
import { useState } from 'react';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import { fetchSchemaStream } from './fetch-schema-stream';
import 'antd/dist/reset.css';

export function GenuiExample() {
  const [inputText, setInputText] = useState('');
  const [schema, setSchema] = useState('');
  const [generating, setGenerating] = useState(false);

  async function handleSend() {
    if (!inputText.trim() || generating) return;

    setGenerating(true);
    setSchema('');
    const userInput = inputText;
    setInputText('');

    try {
      await fetchSchemaStream('https://<your-backend-api>/chat/completions', userInput, (schemaChunk) => {
        setSchema((prev) => prev + schemaChunk);
      });
    } catch (error) {
      console.error('Request failed:', error);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="demo-container">
      <div className="input-group">
        <input
          value={inputText}
          type="text"
          placeholder="Enter your question..."
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />
        <button onClick={handleSend}>Send</button>
      </div>
      <GenuiConfigProvider materials={materials}>
        <GenuiRenderer content={schema} generating={generating} />
      </GenuiConfigProvider>
    </div>
  );
}
```

Styles:

```css
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
```

## Related documentation

- See the [Renderer component docs](../../components/react/renderer) for the full API
- See [Installation and Configuration](install) for dependencies and materials injection
