# Chat Component - Custom Actions

In the `GenuiChat` component, a built-in continue-chat Action `continueChat` is included. You can pass custom Actions via the `customActions` prop so the AI can invoke them from generated UI.

## Basic Usage

```vue {14-36}
<template>
  <GenuiChat 
    :url="url" 
    :customActions="customActions"
    :messages="messages"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customActions = [
  {
    name: 'openPage',
    description: 'Open a new page',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the page to open',
        },
        target: {
          type: 'string',
          description: 'Open mode. Options: _self (current window), _blank (new window)',
        },
      },
      required: ['url', 'target'],
    },
    execute: (params: any) => {
      window.open(params.url, params.target || '_self');
    },
  },
];

// Default messages used to demonstrate custom Actions
const messages = [
 // messages omitted
];
</script>
```

## Action Definition Format

Each Action must include the following fields:

- `name`: Action name, invoked in Schema via `this.callAction(name, params)`
- `description`: Action description to help the AI understand when to use it
- `parameters`: Parameter definition as JSON Schema
- `execute`: Execution function (optional, used for frontend implementation)

```typescript
interface CustomAction {
  name: string;
  description: string;
  parameters: JSONSchema;
  execute?: (params: any) => void; // frontend implementation
}
```

## Invoking Actions in Schema

AI-generated Schema can invoke these Actions via `JSFunction`:

```json
{
  "componentName": "TinyButton",
  "props": {
    "children": "Open New Page",
    "onClick": {
      "type": "JSFunction",
      "value": "function() { this.callAction('openPage', { url: 'https://example.com', target: '_blank' }); }"
    }
  }
}
```

## Full Example

<demo vue="../../../../demos/en/chat/custom-actions.vue" />
