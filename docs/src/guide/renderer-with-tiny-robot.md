# Renderer 组件搭配 TinyRobot 使用

本文介绍如何使用 `GenuiRenderer` 组件自行搭配对话组件如 `TinyRobot`。简单演示了如何搭配具体对话组件来控制消息流、UI 渲染和交互逻辑。

## 安装依赖

```bash
npm install @opentiny/genui-sdk-vue @opentiny/genui-sdk-core @opentiny/tiny-robot @opentiny/tiny-robot-kit
# 或
pnpm add @opentiny/genui-sdk-vue @opentiny/genui-sdk-core @opentiny/tiny-robot @opentiny/tiny-robot-kit
# 或
yarn add @opentiny/genui-sdk-vue @opentiny/genui-sdk-core @opentiny/tiny-robot @opentiny/tiny-robot-kit
```

## 基础使用

首先，创建一个自定义的模型提供者来处理流式返回。以下是 `CustomModelProvider` 的完整实现：

````typescript
import {
  BaseModelProvider,
  type ChatCompletionRequest,
  type ChatCompletionStreamResponse,
} from '@opentiny/tiny-robot-kit';
import { reactive } from 'vue';
import type { IChatMessage } from '@opentiny/genui-sdk-core';
import { v4 as uuidv4 } from 'uuid';

// 简化的 Schema 流式处理逻辑（只处理 schema-card 和 markdown）
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
                lastMessage.id = uuidv4();
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

然后在你的组件中使用：

```vue
<script setup lang="ts">
import { ref, computed, h, reactive } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';
import { TrBubbleList, TrSender, TrBubbleProvider, BubbleMarkdownContentRenderer } from '@opentiny/tiny-robot';
import { AIClient, GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import '@opentiny/tiny-robot/dist/style.css';
import type { IRendererProps } from '@opentiny/genui-sdk-vue';
import { CustomModelProvider } from './CustomModelProvider'; // 引入上面定义的 CustomModelProvider

// 初始化 AI 客户端
const client = new AIClient({
  provider: 'custom',
  providerImplementation: new CustomModelProvider('https://your-chat-backend/api'),
});

// 消息管理
const messages = ref<ChatMessage[]>([]);
const inputMessage = ref('');
const messageState = reactive({ status: STATUS.INIT, errorMsg: null });
let abortController: AbortController | null = null;

const generating = computed(() => GeneratingStatus.includes(messageState.status));

// 发送消息
const sendMessage = async () => {
  if (generating.value || !inputMessage.value.trim()) return;

  const userMessage: ChatMessage = {
    role: 'user',
    content: inputMessage.value,
  };
  messages.value.push(userMessage);
  inputMessage.value = '';

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
        onError: (error) => {
          messageState.status = STATUS.ERROR;
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

// 配置消息渲染器
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

const handleSend = ({ llmFriendlyMessage }: any) => {
  inputMessage.value = llmFriendlyMessage;
  sendMessage();
};
</script>

<template>
  <TrBubbleProvider :content-renderers="messageRenderers">
    <TrBubbleList :items="messages" />
    <TrSender v-model="inputMessage" @send="handleSend" />
  </TrBubbleProvider>
</template>
```

## 其他相关文档

- 查看 [Renderer 组件文档](../components/renderer) 了解详细的 API
- 查看 [自定义组件示例](../examples/renderer/custom-components) 学习如何创建自定义组件
- 查看 [自定义操作示例](../examples/renderer/custom-actions) 学习如何创建自定义操作
