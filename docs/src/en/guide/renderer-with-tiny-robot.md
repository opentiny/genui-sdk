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

First, create a custom model provider to handle streaming responses. Below is the full `CustomModelProvider` implementation:

````typescript
import {
  BaseModelProvider,
  type ChatCompletionRequest,
  type ChatCompletionStreamResponse,
} from '@opentiny/tiny-robot-kit';
import { reactive } from 'vue';
import type { IChatMessage } from '@opentiny/genui-sdk-vue';

// Simplified schema streaming logic (handles schema-card and markdown only)
function useSchemaStream() {
  let inSchemaStream = false;
  let bufferText = '';

  const schemaFlag = '```schemaJson';
  const endFlag = '```';

  const isSchemaJsonStart = (str: string): boolean => {
    const index = str.indexOf('`');
    if (index === -1) return false;
    return schemaFlag.startsWith(str.substring(index, index + schemaFlag.length));
  };

  const isSchemaJsonEnd = (str: string): boolean => {
    const index = str.lastIndexOf('\n');
    if (index === -1) return false;
    if (str.includes(`\n${endFlag}`)) {
      return true;
    }
    const newStr = str.slice(index).trim().substring(0, endFlag.length);
    return endFlag.startsWith(newStr);
  };

  const handleSchemaStream = (content: string, chatMessage: IChatMessage): boolean => {
    if (!content || typeof content !== 'string') return false;

    const deltaPart = bufferText + content;

    if ((!inSchemaStream && isSchemaJsonStart(deltaPart)) || (inSchemaStream && isSchemaJsonEnd(deltaPart))) {
      const matchFlag = inSchemaStream ? /(\n\s*)```/ : schemaFlag;
      const matchPart = deltaPart.match(matchFlag)?.[0];
      if (!matchPart) {
        bufferText = deltaPart;
        return true;
      }

      chatMessage.content += deltaPart;

      if (inSchemaStream) {
        const trimmedDelta = deltaPart.trim();
        const [schemaPart, markdownPart] = trimmedDelta.split(matchPart);
        const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
        if (lastMessage?.type === 'schema-card') {
          lastMessage.content += schemaPart;
        }
        if (markdownPart) {
          chatMessage.messages.push({ type: 'markdown', content: markdownPart });
        }
      } else {
        const trimmedDelta = deltaPart.trim();
        const [markdownPart, schemaPart] = trimmedDelta.split(matchPart);
        if (markdownPart) {
          const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
          if (lastMessage && lastMessage.type === 'markdown') {
            lastMessage.content += markdownPart;
          } else {
            chatMessage.messages.push({ type: 'markdown', content: markdownPart });
          }
        }
        chatMessage.messages.push({ type: 'schema-card', content: schemaPart });
      }

      inSchemaStream = !inSchemaStream;
      bufferText = '';
      return true;
    }

    bufferText = '';

    if (inSchemaStream) {
      chatMessage.content += deltaPart;
      const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
      if (lastMessage && lastMessage.type === 'schema-card') {
        lastMessage.content += deltaPart;
      }
      return true;
    }

    chatMessage.content += deltaPart;
    const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
    if (lastMessage?.type === 'markdown') {
      lastMessage.content += deltaPart;
    } else {
      chatMessage.messages.push({ type: 'markdown', content: deltaPart });
    }

    return false;
  };

  return { handleSchemaStream };
}

export class CustomModelProvider extends BaseModelProvider {
  constructor(private url: string) {
    super({ provider: 'custom' });
  }

  async chatStream(
    request: ChatCompletionRequest,
    handler: {
      onData: (data: ChatCompletionStreamResponse) => void;
      onDone: () => void;
      onError: (error: any) => void;
    },
  ) {
    const { onDone, onData } = handler;
    let response: Response;

    try {
      response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: request.messages,
          model: 'deepseek-v3.2',
          stream: true,
        }),
        signal: request.options?.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      onDone({ type: 'error', error } as any);
      return;
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    const { handleSchemaStream } = useSchemaStream();

    const chatMessage = reactive<IChatMessage>({
      role: 'assistant',
      content: '',
      messages: [],
    });
    onData(chatMessage as any);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const lineEnd = buffer.indexOf('\n');
        if (lineEnd === -1) break;

        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onDone();
            return;
          }

          try {
            const chunk = JSON.parse(data);
            const delta = chunk.choices?.[0]?.delta;
            const content = delta?.content;

            if (content) {
              handleSchemaStream(content, chatMessage);
              const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
              if (lastMessage && lastMessage.type === 'schema-card' && !lastMessage.id) {
                // Demo only: use Math.random as key
                lastMessage.id = Math.random().toString(36).substring(2, 15);
              }
              onData(chatMessage as any);
            }
          } catch (e) {
            console.error('Parse error:', e);
          }
        }
      }
    }

    onDone();
  }
}
````

Then use it in your component:

```vue
<script setup lang="ts">
import { ref, computed, h, reactive } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import { TrBubbleList, TrSender, TrBubbleProvider, BubbleMarkdownContentRenderer } from '@opentiny/tiny-robot';
import { AIClient, GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import '@opentiny/tiny-robot/dist/style.css';
import type { IRendererProps } from '@opentiny/genui-sdk-vue';
import { CustomModelProvider } from './CustomModelProvider'; // Import CustomModelProvider defined above

const client = new AIClient({
  provider: 'custom',
  providerImplementation: new CustomModelProvider('https://your-chat-backend/api'),
});

const messages = ref<ChatMessage[]>([]);
const inputMessage = ref('');
const messageState = reactive({ status: STATUS.INIT, errorMsg: null });
let abortController: AbortController | null = null;

const generating = computed(() => GeneratingStatus.includes(messageState.status));

const sendMessage = async (messageContent: string) => {
  if (generating.value || !messageContent.trim()) return;

  const userMessage: ChatMessage = {
    role: 'user',
    content: messageContent,
  };
  messages.value.push(userMessage);

  messageState.status = STATUS.PROCESSING;
  abortController = new AbortController();

  try {
    await client.chatStream(
      {
        messages: messages.value,
        options: { stream: true, signal: abortController.signal },
      },
      {
        onData: (data: any) => {
          messageState.status = STATUS.STREAMING;
          const lastMessage = messages.value[messages.value.length - 1];
          if (lastMessage?.role === 'assistant') {
            Object.assign(lastMessage, data);
          } else {
            messages.value.push(data);
          }
        },
        onError: (error: any) => {
          messageState.status = STATUS.ERROR;
          messageState.errorMsg = error;
          console.error('Stream error:', error);
        },
        onDone: () => {
          messageState.status = STATUS.FINISHED;
        },
      },
    );
  } catch (error) {
    messageState.status = STATUS.ERROR;
  } finally {
    abortController = null;
  }
};

const abortRequest = () => {
  abortController?.abort();
  messageState.status = STATUS.FINISHED;
};

const markdownRenderer = new BubbleMarkdownContentRenderer({
  defaultAttrs: { class: 'markdown-content' },
});

const lastSchemaCardId = computed(() => {
  const lastMsg = messages.value[messages.value.length - 1];
  if (lastMsg?.role !== 'assistant') return null;
  const items = (lastMsg as any).messages;
  if (!Array.isArray(items) || !items.length) return null;
  const schemaCard = items.find((m: any) => m.type === 'schema-card');
  return schemaCard?.id || null;
});

const messageRenderers = {
  'schema-card': (props: IRendererProps) => {
    return h(
      'div',
      {},
      h(GenuiRenderer, {
        ...props,
        generating: lastSchemaCardId.value === props.id ? generating.value : false,
      }),
    );
  },
  markdown: markdownRenderer,
};

const handleSubmit = (content: string) => {
  sendMessage(content);
};

const roles = {
  user: {
    placement: 'end',
  },
  assistant: {
    placement: 'start',
    customContentField: 'messages',
  },
};
</script>

<template>
  <div class="chat-container">
    <div class="messages-container">
      <TrBubbleProvider :content-renderers="messageRenderers">
        <TrBubbleList :items="messages" :roles="roles" />
      </TrBubbleProvider>
    </div>
    <div class="sender-container">
      <TrSender
        v-model="inputMessage"
        :loading="generating"
        :placeholder="generating ? 'Thinking...' : 'Enter a message'"
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

## Related documentation

- See the [Renderer component docs](../components/renderer) for the full API
- See [custom components example](../examples/renderer/custom-components) to learn how to create custom components
- See [custom actions example](../examples/renderer/custom-actions) to learn how to create custom actions
