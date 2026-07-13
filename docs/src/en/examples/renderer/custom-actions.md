# Renderer - Custom Actions

Custom actions let you implement complex interaction logic. Pair them with prompts so the LLM emits schema JSON that invokes those actions.

## Passing customActions to the Renderer

Pass actions via the `customActions` prop. Each action includes:

- `name`: Action name
- `description`: Action description
- `execute`: Handler receiving `params` and `context`
- `parameters`: Optional parameter schema; the model uses it to fill `params` for `execute`

### execute Parameters

- `params`: Arguments passed when the action is invoked
- `context`: Renderer context (state and methods); use `context.state` for two-way bound global state

### Example 1: Open a Page

```vue {12-35}
<template>
  <GenuiRenderer :content="content" :generating="generating" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({});

const customActions = {
  openPage: {
    name: 'openPage',
    description: 'Open a page',
    execute: (params: any, context: Record<string, any>) => {
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
</script>
```

#### Full Example

<demo vue="../../../../demos/en/renderer/custom-actions-open-page.vue" />

### Example 2: Show Live Form Binding

```vue {12-33}
<template>
  <GenuiRenderer :content="content" :generating="generating" :customActions="customActions" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({});

const customActions = {
  showNotification: {
    name: 'showNotification',
    description: 'Show a notification with live form-bound state',
    execute: (params: any, context: Record<string, any>) => {
      const state = context.state;
      const message = JSON.stringify(state);

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
</script>
```

#### Full Example

<demo vue="../../../../demos/en/renderer/custom-actions-form.vue" />

## Send Custom Actions to the Server

After registering actions on the renderer, include them in chat requests so the model can generate correct action calls.

```ts {9-30}
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: userInput }],
    model: 'deepseek-v3.2',
    stream: true,
    metadata: {
      tinygenui: JSON.stringify({
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
          }
        ]
      }),
    },
  }),
});
```
