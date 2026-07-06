# Using Renderer with TinyRobot

This guide explains how to use the `GenuiRenderer` component with a chat UI such as `TinyRobot`. It demonstrates how to combine a chat component to control message flow, UI rendering, and interaction logic.

## Install dependencies

:::: tabs
== npm
```bash
npm install @opentiny/genui-sdk-vue @opentiny/tiny-robot @opentiny/tiny-robot-kit
```
== pnpm
```bash
pnpm add @opentiny/genui-sdk-vue @opentiny/tiny-robot @opentiny/tiny-robot-kit
```
== yarn
```bash
yarn add @opentiny/genui-sdk-vue @opentiny/tiny-robot @opentiny/tiny-robot-kit
```
::::

## Basic usage

> **tiny-robot 0.4.x**: `AIClient` + `BaseModelProvider` are no longer used. Connect to backend SSE via `useConversation`'s `responseProvider`, and handle schema streaming chunks in `onCompletionChunk`.

First, define a `responseProvider` that converts backend SSE into an async generator consumable by tiny-robot:

```typescript
import { sseStreamToGenerator } from '@opentiny/tiny-robot-kit';
import type { MessageRequestBody } from '@opentiny/tiny-robot-kit';

const CHAT_URL = 'https://your-chat-backend/api';

export function createChatResponseProvider() {
  return async (requestBody: MessageRequestBody, abortSignal: AbortSignal) => {
    const response = await fetch(CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: requestBody.messages,
        model: 'deepseek-v3.2',
        stream: true,
      }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return sseStreamToGenerator(response, { signal: abortSignal });
  };
}
```

Place schema chunk parsing in `onCompletionChunk` (same idea as `genuiStreamHandler` inside `GenuiChat`). See SDK source `chat-v2/genuiStreamHandler.ts` for the full parser; the example below only shows wiring.

Then use `useConversation` + `GenuiRenderer` in your component:

```vue
<script setup lang="ts">
import { computed, h, ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import { TrBubbleList, TrSender, TrBubbleProvider, BubbleMarkdownContentRenderer } from '@opentiny/tiny-robot';
import { useConversation } from '@opentiny/tiny-robot-kit';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import '@opentiny/tiny-robot/dist/style.css';
import type { IRendererProps } from '@opentiny/genui-sdk-vue';
import { createChatResponseProvider } from './createChatResponseProvider';

const inputMessage = ref('');

const conversation = useConversation({
  useMessageOptions: {
    responseProvider: createChatResponseProvider(),
    plugins: [{ name: 'thinking', disabled: true }],
    // onCompletionChunk: genuiStreamHandler.onCompletionChunk, // reuse SDK impl in production
  },
});

const engine = computed(() => conversation.activeConversation.value?.engine);
const messages = computed(() => engine.value?.messages.value ?? []);
const isProcessing = computed(() => engine.value?.isProcessing.value ?? false);

const sendMessage = async (messageContent: string) => {
  if (isProcessing.value || !messageContent.trim() || !engine.value) {
    return;
  }

  engine.value.messages.value.push({
    role: 'user',
    content: messageContent,
  } as ChatMessage);

  await engine.value.send();
};

const abortRequest = () => {
  void engine.value?.abortRequest();
};

const markdownRenderer = new BubbleMarkdownContentRenderer({
  defaultAttrs: { class: 'markdown-content' },
});

const lastSchemaCardId = computed(() => {
  const lastMsg = messages.value[messages.value.length - 1];
  if (lastMsg?.role !== 'assistant') return null;
  const items = (lastMsg as ChatMessage & { messages?: { type?: string; id?: string }[] }).messages;
  if (!Array.isArray(items) || !items.length) return null;
  const schemaCard = items.find((m) => m.type === 'schema-card');
  return schemaCard?.id || null;
});

const messageRenderers = {
  'schema-card': (props: IRendererProps) =>
    h(GenuiRenderer, {
      ...props,
      generating: lastSchemaCardId.value === props.id ? isProcessing.value : false,
    }),
  markdown: markdownRenderer,
};

const handleSubmit = (content: string) => {
  inputMessage.value = '';
  void sendMessage(content);
};

const roleConfigs = {
  user: { placement: 'end' as const },
  assistant: { placement: 'start' as const },
};
</script>

<template>
  <div class="chat-container">
    <div class="messages-container">
      <TrBubbleProvider :content-renderers="messageRenderers">
        <TrBubbleList
          :messages="messages"
          :role-configs="roleConfigs"
          content-render-mode="split"
        />
      </TrBubbleProvider>
    </div>
    <div class="sender-container">
      <TrSender
        v-model="inputMessage"
        :loading="isProcessing"
        :placeholder="isProcessing ? 'Thinking...' : 'Type a message'"
        @submit="handleSubmit"
        @cancel="abortRequest"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #f5f5f5;
}

.messages-container {
  flex: 1;
  overflow: auto;
  padding: 16px;
}

.sender-container {
  flex-shrink: 0;
  padding: 16px;
  background: #fff;
  border-top: 1px solid #e5e5e5;
}
</style>
```

If you do not need to assemble the message pipeline yourself, use [`GenuiChat`](../components/chat) out of the box — it already wraps `responseProvider`, `genuiStreamHandler`, and schema rendering.

## Related documentation

- See the [Renderer component docs](../components/renderer) for the full API
- See [custom components example](../examples/renderer/custom-components) to learn how to create custom components
- See [custom actions example](../examples/renderer/custom-actions) to learn how to create custom actions
