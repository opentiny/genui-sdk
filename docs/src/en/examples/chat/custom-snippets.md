# Chat Component - Custom Snippets

Custom Snippets provide common component composition patterns to help the LLM quickly generate typical UI structures. Use them together with prompts so the LLM outputs the corresponding schemaJson for these snippets.

## Snippet Definition Format

Each Snippet must include the following fields:

```typescript
type IGenPromptSnippet = NodeSchema;


interface NodeSchema {
  componentName: string;
  props?: Record<string, any>;
  children?: NodeSchema[];
  [key: string]: any;
}
```

- `componentName`: Component name
- `props`: Component properties
- `children`: Child component array used to define the composition structure

## Tabs Composition Example

The following example shows how to use `TinyTabs` and `TinyTabItem` to create a tab layout. `TinyTabs` serves as the container component and `TinyTabItem` as tab items; the two must be used together:

```vue {10-51}
<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat :url="url" :customSnippets="customSnippets" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customSnippets = [
  {
    componentName: 'TinyTabs',
    props: {
      modelValue: 'tab1',
    },
    children: [
      {
        componentName: 'TinyTabItem',
        props: {
          title: 'Tab 1',
          name: 'tab1',
        },
        children: [
          {
            componentName: 'div',
            props: {
              style: 'padding: 16px;',
            },
            children: 'Content of Tab 1',
          },
        ],
      },
      {
        componentName: 'TinyTabItem',
        props: {
          title: 'Tab 2',
          name: 'tab2',
        },
        children: [
          {
            componentName: 'div',
            props: {
              style: 'padding: 16px;',
            },
            children: 'Content of Tab 2',
          },
        ],
      },
    ],
  },
];
</script>
```

## Full Example

<demo vue="../../../../demos/en/chat/custom-snippets.vue" />
