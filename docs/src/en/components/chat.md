# GenuiChat Component

`GenuiChat` is an integrated TinyRobot chat component that wraps session management, streaming responses, generation state, and more, providing an out-of-the-box chat experience.

When using only Chat, you can import it on demand from `@opentiny/genui-sdk-vue/chat`. See [Quick Start - Subpath Imports](../guide/quick-start#subpath-imports).

## Compatibility Component: GenuiLegacyChat

::: warning Materials configuration (since v1.3.0)
`GenuiChat` has been refactored to decouple materials. The component no longer includes any UI materials; inject them via `GenuiConfigProvider`.

For previous behavior, use `GenuiLegacyChat` (`@opentiny/genui-sdk-vue/legacy-chat`) instead.
:::

`GenuiLegacyChat` bundles OpenTiny default materials. Use it when migrating old projects that did not configure `GenuiConfigProvider`.

```vue
<template>
  <GenuiChat ref="chatRef" url="https://your-chat-backend/api" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiLegacyChat as GenuiChat } from '@opentiny/genui-sdk-vue';

const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

function sendMessage() {
  chatRef.value?.setInputMessage('Hello');
}
</script>
```

## Props

### url

- **Type**: `string`
- **Required**: No
- **Description**: Backend service URL for requesting structured data from the large language model.

```vue
<template>
  <GenuiChat url="https://your-chat-backend/api" />
</template>
```

### model

- **Type**: `string`
- **Required**: No
- **Description**: Large language model name.

```vue
<template>
  <GenuiChat :url="url" model="deepseek-v3.2" />
</template>
```

### temperature

- **Type**: `number`
- **Required**: No
- **Default**: `0.3`
- **Description**: Model temperature parameter controlling output randomness.

```vue
<template>
  <GenuiChat :url="url" model="deepseek-v3.2" :temperature="0.7" />
</template>
```

### messages

- **Type**: `IMessage[]`
- **Required**: No
- **Default**: `[]`
- **Description**: Initial conversation context.

```vue
<template>
  <GenuiChat :url="url" :messages="initialMessages" />
</template>

<script setup>
const initialMessages = [
  {
    role: 'user',
    content: 'Hello',
  },
  {
    role: 'assistant',
    content: 'Hello! How can I help you?',
    messages: [
      {
        type: 'text',
        content: 'Hello! How can I help you?',
      },
    ],
  },
];
</script>
```

### chatConfig

- **Type**: `IChatConfig`
- **Required**: No
- **Description**: Chat-related configuration.

```vue
<template>
  <GenuiChat :url="url" :chatConfig="chatConfig" />
</template>

<script setup>
const chatConfig = {
  addToolCallContext: true, // Whether to add tool call context
  showThinkingResult: true, // Whether to show thinking result
};
</script>
```

### customComponents

- **Type**: `ICustomComponentItem[]`
- **Required**: No
- **Description**: Custom component array. Each item includes a schema definition and an optional `ref` (component reference).

```vue
<template>
  <GenuiChat :url="url" :customComponents="customComponents" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import MyCustomComponent from './MyCustomComponent.vue';

const customComponents = [
  {
    component: 'MyCustomComponent',
    name: 'Custom Component',
    description: 'This is a custom component',
    schema: {
      properties: [
        {
          property: 'title',
          type: 'string',
          description: 'Title',
          required: true,
        },
      ],
    },
    ref: MyCustomComponent, // Component reference for rendering
  },
];
</script>
```

See [Chat - Custom Components](../examples/chat/custom-components) for detailed usage.

### customSnippets

- **Type**: `IGenPromptSnippet[]`
- **Required**: No
- **Description**: Custom snippet array providing common component composition patterns.

```vue
<template>
  <GenuiChat :url="url" :customSnippets="customSnippets" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const customSnippets = [
  {
    componentName: 'TinyForm',
    props: {
      labelPosition: 'top',
    },
    children: [
      {
        componentName: 'TinyFormItem',
        props: { label: 'Name', prop: 'name' },
        children: [
          {
            componentName: 'TinyInput',
            props: { placeholder: 'Enter name' },
          },
        ],
      },
    ],
  },
];
</script>
```

See [Chat - Custom Snippets](../examples/chat/custom-snippets) for detailed usage.

### customExamples

- **Type**: `IGenPromptExample[]`
- **Required**: No
- **Description**: Custom example array providing component usage examples.

```vue
<template>
  <GenuiChat :url="url" :customExamples="customExamples" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const customExamples = [
  {
    name: 'Product card example',
    description: 'Shows how to use the product card component',
    schema: {
      componentName: 'ProductCard',
      props: {
        name: 'iPhone 15',
        price: 5999,
      },
    },
  },
];
</script>
```

See [Chat - Custom Examples](../examples/chat/custom-examples) for detailed usage.

### customActions

- **Type**: `any[]`
- **Required**: No
- **Description**: Custom action array defining actions that can be invoked from components.

```vue
<template>
  <GenuiChat :url="url" :customActions="customActions" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const customActions = [
  {
    name: 'openPage',
    description: 'Open a new page',
    parameters: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Target page URL',
        },
      },
      required: ['url'],
    },
    execute: (params: any) => {
      window.open(params.url, '_blank');
    },
  },
];
</script>
```

See [Chat - Custom Actions](../examples/chat/custom-actions) for detailed usage.

### rendererSlots

- **Type**: `IRendererSlots`
- **Required**: No
- **Description**: Slots passed through to `GenuiRenderer`.

```vue
<template>
  <GenuiChat :url="url" :rendererSlots="rendererSlots" />
</template>

<script setup>
const rendererSlots = {
  header: (props) => h('div', 'Custom header'),
  footer: (props) => h('div', 'Custom footer'),
};
</script>
```

### thinkComponent

- **Type**: `Component<IThinkComponentProps>`
- **Required**: No
- **Description**: Custom thinking process component.

```vue
<template>
  <GenuiChat :url="url" :thinkComponent="CustomThinkComponent" />
</template>

<script setup>
import CustomThinkComponent from './custom-think-component.vue';
</script>
```

See [Chat - Custom Thinking Process](../examples/chat/thinking-process) for detailed usage and component prop types.

### roles

- **Type**: `IRolesConfig`
- **Required**: No
- **Description**: Custom role configuration including avatars and styles for user and assistant.

```vue
<template>
  <GenuiChat :url="url" :roles="rolesConfig" />
</template>

<script setup>
const rolesConfig = {
  user: {
    maxWidth: '80%',
    // Other TinyRobot BubbleRoleConfig options
  },
  assistant: {
    maxWidth: '100%',
  },
};
</script>
```

See [Chat - Custom Footer Toolbar](../examples/chat/footer-toolbar) for detailed usage.

### features

- **Type**: `ModelCapability`
- **Required**: No
- **Description**: Model capability configuration, such as image upload and function calling support.

```vue
<template>
  <GenuiChat :url="url" :features="modelFeatures" />
</template>

<script setup>
const modelFeatures = {
  supportImage: {
    enabled: true,
    maxImageSize: 10, // MB
    maxFilesPerRequest: 3,
    supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
  supportFunctionCalling: true,
};
</script>
```

See [Chat - Image Upload](../examples/chat/image-upload) for detailed usage.

### customFetch

- **Type**: `CustomFetch`
- **Required**: No
- **Description**: Custom fetch function for fully customizing HTTP request behavior. Useful for integrating third-party SDKs, adding authentication, handling tool calls, implementing custom streaming responses, and similar scenarios.

```vue
<template>
  <GenuiChat :url="url" :customFetch="customFetch" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import type { CustomFetch } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customFetch: CustomFetch = async (url, options) => {
  // Add auth header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
};
</script>
```

See [Chat - Custom Fetch](../examples/chat/custom-fetch) for detailed usage.

### requiredCompleteFieldSelectors

- **Type**: `string[]`
- **Required**: No
- **Description**: Buffer field selector array specifying which field paths must be complete before updates are applied. This prop is passed through to `GenuiRenderer` to prevent render errors caused by incomplete fields during streaming.

```vue
<template>
  <GenuiChat :url="url" :requiredCompleteFieldSelectors="selectors" />
</template>

<script setup>
const selectors = [
  '[componentName=TinySelect] > props > items', // TinySelect items array must be complete
  '[componentName=TinyTabItem] > props > name', // TinyTabItem name prop must be complete
];
</script>
```

See [Renderer - Buffer Fields](../examples/renderer/required-complete-field-selectors) for detailed usage and selector syntax.

## Slots

### empty

- **Description**: Custom empty state slot. Rendered when there is no conversation content, useful for welcome text, onboarding copy, or placeholder UI.
- **Slot parameters**: None

```vue
<template>
  <GenuiChat :url="url">
    <template #empty>
      <div class="genui-chat-empty">
        <h2>Welcome to GenuiChat</h2>
      </div>
    </template>
  </GenuiChat>
</template>

<style scoped>
.genui-chat-empty {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
}
</style>
```

## Methods

### getConversation

- **Return type**: `UseConversationReturn`
- **Description**: Returns the conversation manager object for session APIs, including conversation list, current session, save/load, and related features.

```vue
<template>
  <GenuiChat ref="chatRef" :url="url" />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

// Get conversation object
const conversation = computed(() => chatRef.value?.getConversation());

// Get all conversations
const conversations = computed(() => conversation.value?.conversations.value || []);

// Get current conversation id
const currentId = computed(() => conversation.value?.activeConversationId.value);
</script>
```

See [Chat - Conversation History](../examples/chat/history) for detailed usage.

## Types

### IMessage

```typescript
interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  messages?: IMessageItem[]; // Custom display content
}

interface IMessageItem {
  type: string;
  content: string;
  [customKey: string]: any;
}
```

### IChatConfig

```typescript
interface IChatConfig {
  addToolCallContext?: boolean; // Whether to add tool call context
  showThinkingResult?: boolean; // Whether to show thinking result
}
```

### ICustomComponentItem

```typescript
interface ICustomComponentItem extends IGenPromptComponent {
  ref?: Component; // Component reference passed to GenuiRenderer
}

interface IGenPromptComponent {
  component: string; // Component name
  schema: {
    properties?: IGenPromptComponentProperty[];
    events?: IGenPromptComponentEvent[];
    slots?: Record<string, any>;
  };
  name?: string; // Component label
  description?: string;
}

interface IGenPromptComponentProperty {
  property: string;
  description: string;
  type: string;
  required?: boolean; // Default false
  defaultValue?: any; // Default empty
  properties?: IGenPromptComponentProperty[];
}

interface IGenPromptComponentEvent {
  type: string;
  functionInfo?: IFunctionInfo;
  defaultValue?: string;
  description: string;
}

interface IFunctionInfo {
  params: IFunctionParam[];
  returns: Record<string, any>;
}

interface IFunctionParam {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}
```

### IGenPromptSnippet

```typescript
type IGenPromptSnippet = NodeSchema; 

interface NodeSchema {
  componentName: string;
  props?: Record<string, any>;
  children?: NodeSchema[];
  [key: string]: any;
}
```

### IGenPromptExample

```typescript
interface IGenPromptExample {
  name: string;
  description?: string;
  schema: CardSchema;
}

interface CardSchema {
  componentName: 'Page';
  props?: Record<string, any>;
  children?: NodeSchema[];
  [key: string]: any;
}
```

### ModelCapability

```typescript
interface ModelCapability {
  supportImage?: ImageFeatures;
  supportFunctionCalling?: boolean;
  [key: string]: any;
}

interface ImageFeatures {
  enabled: boolean;
  maxImageSize: number; // MB
  maxFilesPerRequest: number;
  supportedFileTypes: string[];
}
```

### IRolesConfig

```typescript
interface IRolesConfig {
  user: BubbleRoleConfig; // User role config
  assistant: BubbleRoleConfig; // Assistant role config
}

interface BubbleRoleConfig {
  placement?: 'start' | 'end'; // Message bubble placement
  avatar?: Component | VNode; // Avatar component
  maxWidth?: string; // Maximum message width
  slots?: {
    // Slot config, e.g. footer toolbar
    trailer?: Component<IBubbleSlotsProps>;
  };
}

interface IBubbleSlotsProps {
  index: number;
  bubbleProps: BubbleProps;
  isFinished: boolean;
  messageManager: IMessageManagerBridge;
  chatMessage: IMessage
}
```

### CustomFetch

```typescript
type CustomFetch = (
  url: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body: string;
    signal?: AbortSignal;
  },
) => Promise<Response> | Response;
```

See TinyRobot documentation for `BubbleProps`. `IMessageManagerBridge` is exported from `@opentiny/genui-sdk-vue` and is used in footer slots to access message send APIs:

```typescript
interface IMessageManagerBridge {
  messages: Ref<ChatMessage[]>;
  isProcessing: Ref<boolean>;
  inputMessage: Ref<string>;
  requestState: Ref<string>;
  send: () => Promise<void>;
  sendMessage: (content?: string, clearInput?: boolean) => Promise<void>;
  abortRequest: () => void | Promise<void>;
  addMessage: (message: ChatMessage | ChatMessage[]) => void;
}
```

See [BubbleProps](https://docs.opentiny.design/tiny-robot/guide/bubble.html#props) for definitions and usage.

> **Note**: `GenuiRenderer` provides `materials.components` and `defaultPropsMap` (from `GenuiConfigProvider` materials) to the schema renderer, not the full materials object.
