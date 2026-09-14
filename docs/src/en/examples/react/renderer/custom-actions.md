# Renderer - Custom Actions

Custom actions let you implement complex interaction logic. Pair them with prompts so the LLM emits schema JSON that invokes those actions.

## Passing customActions to the Renderer

Pass actions via the `customActions` prop. Each action includes:

- `name`: Action name
- `description`: Action description
- `parameters`: Parameter JSON Schema
- `return`: (optional) Return value JSON Schema; omit when there is no return value
- `async`: (optional) Whether the action is async; defaults to `false`. When `true`, `execute` should return a Promise
- `execute`: Handler receiving `params` and `context`

### execute Parameters

- `params`: Arguments passed when the action is invoked
- `context`: Renderer context (state and methods); use `context.state` for two-way bound global state

When `async: true`, `execute` returns a Promise and so does `this.callAction`. You can chain it in Schema `methods`:

```json
{
  "methods": {
    "handleSubmit": {
      "type": "JSFunction",
      "value": "function() { this.callAction('validateForm').then(function(result) { console.log(result); }); }"
    }
  }
}
```

### Example 1: Open a Page

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const generating = false;
const content = {};

const customActions = {
  openPage: {
    name: 'openPage',
    description: 'Open a page',
    execute: (params: { url: string; target?: string }) => {
      const { url, target = '_self' } = params;
      window.open(url, target);
    },
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL to open',
        },
        target: {
          type: 'string',
          description: 'Target window: _self (same tab) or _blank (new tab)',
        },
      },
      required: ['url', 'target'],
    },
  },
};

export default function Example() {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={content} generating={generating} customActions={customActions} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

#### Full Example

<demo react="../../../../../demos/react/renderer/custom-actions-open-page.tsx" />

### Example 2: Show Live Form Binding

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const generating = false;
const content = {};

const customActions = {
  showNotification: {
    name: 'showNotification',
    description: 'Show a notification with live-bound form state',
    execute: (params: { title: string }, context: Record<string, unknown>) => {
      const message = JSON.stringify(context.state);
      alert(`${params.title}: ${message}`);
    },
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Notification title',
        },
      },
      required: ['title'],
    },
  },
};

export default function Example() {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={content} generating={generating} customActions={customActions} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

#### Full Example

<demo react="../../../../../demos/react/renderer/custom-actions-form.tsx" />

## Send Custom Actions to the Server

After adding custom actions on the renderer, also send their metadata to the LLM chat service:

```ts
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
        customActions: [
          {
            name: 'openPage',
            description: 'Open a page',
            parameters: {
              type: 'object',
              properties: {
                url: {
                  type: 'string',
                  description: 'URL to open',
                },
                target: {
                  type: 'string',
                  description: 'Target window: _self (same tab) or _blank (new tab)',
                },
              },
              required: ['url', 'target'],
            },
          },
        ],
      }),
    },
  }),
});
```
