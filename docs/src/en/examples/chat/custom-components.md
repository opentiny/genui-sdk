# Chat Component - Custom Components

In the `GenuiChat` component, you can pass custom components via the `customComponents` prop to extend the component library available to the LLM.

## Basic Usage

```vue { 16-43 }
<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat
      :url="url"
      :customComponents="customComponents"
      :messages="messages"
    />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import UserProfile from './components/user-profile.vue';

const url = 'https://your-chat-backend/api';

// Custom component configuration passed to GenuiChat
const customComponents = [
  {
    component: 'UserProfile',
    name: 'User Profile',
    description: 'Displays basic user information and avatar',
    schema: {
      properties: [
        {
          property: 'name',
          type: 'string',
          description: 'User name',
          required: true,
        },
        {
          property: 'email',
          type: 'string',
          description: 'User email',
        },
        {
          property: 'avatar',
          type: 'string',
          description: 'Avatar URL',
        },
      ],
    },
    ref: UserProfile,
  },
];

// Default messages used to display custom components in the conversation (note the schema-card schema structure)
const messages = [
  // messages omitted
];
</script>
```

## Example schemaJson returned by the LLM

```json
{
  "type": "schema-card",
  "componentName": "Page",
  "children": [
    {
      "componentName": "Text",
      "props": {
        "text": "Custom Component Example",
        "style": "font-size: 20px; font-weight: bold; margin-bottom: 16px;"
      }
    },
    {
      "componentName": "UserProfile",
      "props": {
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "/genui-sdk-docs/logo.svg"
      }
    }
  ]
}
```

When the AI generates a schema, ensure `componentName` matches the component name registered in `customComponents`, and pass `props` according to the fields defined in `schema`.

## Full Example

<demo vue="../../../../demos/en/chat/custom-components.vue" :vueFiles="['../../../../demos/en/chat/custom-components.vue',  '../../../../demos/chat/components/user-profile.vue']" />
