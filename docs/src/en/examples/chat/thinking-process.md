# Chat Component - Custom Thinking Process

The `GenuiChat` component supports a custom thinking-process display component so users can see the AI's real-time response status.

## Basic Usage

Use the `thinkComponent` prop to customize the thinking-process display component.

```vue
<template>
  <GenuiChat :url="url" model="deepseek-v3.2" :thinkComponent="CustomThinkComponent" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import CustomThinkComponent from './components/custom-think-component.vue';

const url = 'https://your-chat-backend/api';
</script>
```

## Received Props

The custom thinking component receives the following props:

### `message: IChatMessage`

The full message object for this turn of the conversation:

```typescript
interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
  messages?: IMessageItem[];
}

interface IMessageItem {
  type: string;
  content: string;
  [customKey: string]: any;
}
```

### `emitter: INotificationEventEmitter`

Used to listen for notification events during streaming responses:

```typescript
interface INotificationEventEmitter {
  on(eventName: 'notification', callback: (payload: INotificationPayload) => void, once?: boolean): void;
  off(eventName: 'notification', callback: (payload: INotificationPayload) => void): void;
  once(eventName: 'notification', callback: (payload: INotificationPayload) => void): void;
}

type INotificationPayload =
  | {
      type: 'markdown' | 'schema-card' | 'done';
      delta: IStreamDelta;
      chatMessage: IChatMessage;
    }
  | {
      type: 'tool';
      delta: IStreamDelta;
      chatMessage: IChatMessage;
      toolCallData: IMessageItem & {
        type: 'tool';
      };
    };

interface IStreamDelta {
  content?: string;
  tool_calls?: Array<{
    id: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_calls_result?: Array<{
    id: string;
    function: {
      arguments: any;
      result: any;
    };
  }>;
}
```

#### Payload Details

##### 1. `type: 'markdown'`

Triggered when the AI is generating Markdown content:

```typescript
{
  type: 'markdown';
  delta: IStreamDelta; // incremental data, includes the content field
  chatMessage: IChatMessage; // full message object
}
```

**Use case**: When the goal is to generate a card, Markdown can be shown as the thinking process.

##### 2. `type: 'schema-card'`

Triggered when the AI is generating a Schema Card (UI component):

```typescript
{
  type: 'schema-card';
  delta: IStreamDelta;
  chatMessage: IChatMessage;
}
```

**Use case**: Show prompts such as "Generating card...".

##### 3. `type: 'tool'`

Triggered when the AI is invoking a tool:

```typescript
{
  type: 'tool';
  delta: IStreamDelta;
  chatMessage: IChatMessage;
  toolCallData: IToolMessageItem; // tool call data
}
```

`toolCallData` includes the following fields:

- `name: string` - Tool name
- `status: 'running' | 'success' | 'failed' | 'cancelled'` - Tool call status
- `content: string` - Tool call arguments and result (JSON string)

**Use case**: Display tool call status, e.g. "Calling getWeather...", "Called getWeather...".

##### 4. `type: 'done'`

Triggered when the streaming response completes:

```typescript
{
  type: 'done';
  delta: IStreamDelta;
  chatMessage: IChatMessage;
}
```

**Use case**: Hide loading state and clean up temporary data.

## Example Implementation

The following is a thinking component implementation based on production code:

```vue
<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { INotificationPayload, IThinkComponentProps } from '@opentiny/genui-sdk-vue';

const props = defineProps<IThinkComponentProps>();

const loadingText = ref('Responding...');

const toolStatusTextMap = new Map<string, { text: string }>([
  ['running', { text: 'Calling' }],
  ['success', { text: 'Called' }],
  ['failed', { text: 'Call failed' }],
  ['cancelled', { text: 'Cancelled' }],
]);

const handleNotification = (payload: INotificationPayload) => {
  // Clear loading text when the response completes
  if (payload.type === 'done') {
    loadingText.value = '';
    return;
  }

  // Generating a card
  if (payload.type === 'schema-card') {
    loadingText.value = 'Generating card...';
    return;
  }

  // If thinking result display is enabled, show a generic responding state
  if (props.showThinkingResult) {
    loadingText.value = 'Responding...';
    return;
  }

  // Tool call status
  if (payload.type === 'tool') {
    const { toolCallData } = payload;
    loadingText.value = `${toolStatusTextMap.get(toolCallData.status)?.text} ${toolCallData.name}...`;
    return;
  }

  // Markdown content generation
  // type === 'markdown'
  const lastMessage = payload.chatMessage.messages[payload.chatMessage.messages.length - 1];
  if (lastMessage) {
    loadingText.value = `${lastMessage.content}...`;
  }
};

onMounted(() => {
  props.emitter.on('notification', handleNotification);
});

onBeforeUnmount(() => {
  props.emitter.off('notification', handleNotification);
});
</script>

<template>
  <div v-if="loadingText" class="loading-container" type="loading-text">{{ loadingText }}</div>
</template>

<style scoped lang="less">
.loading-container[type='loading-text'] {
  margin: 10px 0;
  background: linear-gradient(90deg, #666 0%, #666 45%, #999 50%, #999 55%, #666 60%, #666 100%);
  background-size: 200% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: text-shimmer 6s linear infinite;
}
</style>
```

## Code Explanation

### Event Handling Logic

1. **`done` event**: When streaming completes, clear `loadingText` and hide the component.

2. **`schema-card` event**: When a UI component is being generated, show "Generating card...".

3. **`showThinkingResult` is `true`**: If thinking result display is enabled, always show "Responding..." instead of specific tool call or content generation status.

4. **`tool` event**: Display text based on tool call status (running, success, failed, cancelled), e.g. "Calling getWeather...".

5. **`markdown` event**: Show a preview of the last message content, e.g. "Hello...".
