# GenuiRenderer Component

`GenuiRenderer` is the core rendering component (Renderer) of GenUI SDK. It renders structured JSON Schema returned by large language models into interactive UI.

When using only Renderer, you can import it on demand from `@opentiny/genui-sdk-react/renderer`. See [Install - Subpath Imports](../../guide/react/install#subpath-imports).

::: warning Materials required
`GenuiRenderer` does not include UI materials. Use it with `GenuiConfigProvider`'s `materials` prop. See [GenuiConfigProvider](./config-provider) and [Installation](../../guide/react/install#materials-configuration).
:::

## Props

### content

- **Type**: `string | object`
- **Required**: Yes
- **Description**: Schema content as a string or object. When a string is passed, the component attempts to parse "partial JSON" and auto-complete it, supporting streaming updates.

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';

const schemaContent = {
  componentName: 'Page',
  children: [
    {
      componentName: 'Text',
      props: {
        text: 'Hello World',
      },
    },
  ],
};

export function Example() {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={schemaContent} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

### isJsonComplete

- **Type**: `boolean`
- **Required**: No
- **Description**: Applies only when `content` is a JSON object. Marks whether the current JSON is complete, helping the buffer logic determine whether values are complete. Pass `true` when you already have a complete schema object and do not need streaming repair.

```tsx
import { useState } from 'react';
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

export function Example() {
  const [content] = useState({
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: {
          text: 'Hello World',
          style: 'color:',
        },
      },
    ],
  });
  const [isJsonComplete] = useState(false);

  return <GenuiRenderer content={content} isJsonComplete={isJsonComplete} />;
}
```

### generating

- **Type**: `boolean`
- **Required**: No
- **Description**: Indicates whether the current conversation is still generating. Used to control UI loading state.

```tsx
import { useState } from 'react';
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

export function Example() {
  const [isGenerating] = useState(true);
  const content = {
    componentName: 'Page',
    children: [
      {
        componentName: 'Text',
        props: { text: 'Hello World' },
      },
    ],
  };

  return <GenuiRenderer content={content} generating={isGenerating} />;
}
```

### customComponents

- **Type**: `Record<string, ComponentType>`
- **Required**: No
- **Description**: Custom component map for extending the available component list. Merged with materials from `GenuiConfigProvider`; `customComponents` wins on name conflicts.

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';
import { MyCustomComponent } from './MyCustomComponent';

const schemaContent = {
  componentName: 'Page',
  children: [
    {
      componentName: 'MyCustomComponent',
      props: { foo: 'bar' },
    },
  ],
};

const customComponents = {
  MyCustomComponent,
};

export function Example() {
  return <GenuiRenderer content={schemaContent} customComponents={customComponents} isJsonComplete />;
}
```

### customActions

- **Type**: `Record<string, { execute: (params: any, context: any) => void }>`
- **Required**: No
- **Description**: Custom action map defining actions that can be invoked from components.

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

const schemaContent = {
  componentName: 'Page',
  children: [
    {
      componentName: 'Text',
      props: {
        text: 'Hello World',
        onClick: {
          type: 'JSFunction',
          value: "function() { this.callAction('showNotification', { message: 'User clicked HelloWorld' })}",
        },
      },
    },
  ],
};

const customActions = {
  openPage: {
    execute: (params) => {
      window.open(params.url, params.target || '_self');
    },
  },
  showNotification: {
    execute: (params) => {
      console.log('Notification:', params.message);
    },
  },
};

export function Example() {
  return <GenuiRenderer content={schemaContent} customActions={customActions} isJsonComplete />;
}
```

See [Renderer custom actions](../../examples/react/renderer/custom-actions) for detailed usage.

### requiredCompleteFieldSelectors

- **Type**: `string[]`
- **Required**: No
- **Description**: Specifies which field paths must be complete before updates are applied. Used to control buffering strategy during streaming updates.

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

const requiredCompleteFieldSelectors = ['[componentName=Text] > props > onClick'];

export function Example({ content }: { content: string }) {
  return (
    <GenuiRenderer content={content} requiredCompleteFieldSelectors={requiredCompleteFieldSelectors} />
  );
}
```

### state

- **Type**: `Record<string, any>`
- **Required**: No
- **Description**: Global state passed to the renderer, accessible in components via context.

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

const schemaContent = {
  componentName: 'Page',
  state: {
    userId: null,
    userName: '',
  },
  children: [
    {
      componentName: 'Text',
      props: {
        text: {
          type: 'JSExpression',
          value: 'this.state.userName',
        },
      },
    },
  ],
};

const state = {
  userId: 123,
  userName: 'John',
};

export function Example() {
  return <GenuiRenderer content={schemaContent} state={state} isJsonComplete />;
}
```

See [Renderer merged state](../../examples/react/renderer/state) for detailed usage.

### id

- **Type**: `string`
- **Required**: No
- **Description**: Card identifier written to the renderer context as `cardId`, useful for distinguishing instances in custom actions.

```tsx
import { GenuiRenderer } from '@opentiny/genui-sdk-react';

export function Example({ content }: { content: string }) {
  return <GenuiRenderer content={content} id="card-1" isJsonComplete />;
}
```

## Types

### IRendererProps

```typescript
interface IRendererProps {
  content: string | Record<string, unknown>;
  isJsonComplete?: boolean;
  generating?: boolean;
  customComponents?: Record<string, ComponentType>;
  customActions?: Record<string, ICustomAction>;
  requiredCompleteFieldSelectors?: string[];
  id?: string;
  state?: Record<string, unknown>;
}
```

### ICustomAction

```typescript
interface ICustomAction {
  execute: (params: unknown, context: Record<string, unknown>) => unknown;
  name?: string;
  description?: string;
  parameters?: unknown;
  return?: unknown;
  async?: boolean;
}
```
