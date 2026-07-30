# Renderer 组件搭配 TinyRobot 使用

本文介绍如何使用 `GenuiRenderer` 组件自行搭配对话组件如 `TinyRobot`。简单演示了如何搭配具体对话组件来控制消息流、UI 渲染和交互逻辑。

## 安装依赖

:::: tabs
== npm
```bash
npm install @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue @opentiny/tiny-robot @opentiny/tiny-robot-kit
```
== pnpm
```bash
pnpm add @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue @opentiny/tiny-robot @opentiny/tiny-robot-kit
```
== yarn
```bash
yarn add @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue @opentiny/tiny-robot @opentiny/tiny-robot-kit
```
::::

## 基础使用

首先，创建一个自定义的模型提供者来处理流式返回。以下是 `CustomModelProvider` 的完整实现：

````typescript
import {
  BaseModelProvider,
  type ChatCompletionRequest,
  type ChatCompletionStreamResponse,
} from '@opentiny/tiny-robot-kit';
import { PatternExtractor, type IChatMessage } from '@opentiny/genui-sdk-core';
import { reactive } from 'vue';

function appendMarkdown(content: string, chatMessage: IChatMessage) {
  const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
  if (lastMessage?.type === 'markdown') {
    lastMessage.content += content;
  } else {
    chatMessage.messages.push({ type: 'markdown', content });
  }
}

function appendSchemaCard(content: string, chatMessage: IChatMessage) {
  const lastMessage = chatMessage.messages[chatMessage.messages.length - 1];
  if (lastMessage?.type === 'schema-card') {
    lastMessage.content += content;
  } else {
    chatMessage.messages.push({ type: 'schema-card', content });
  }
}

// 用 PatternExtractor 拆分 markdown 与 schemaJson（默认 SchemaJsonPattern）
function useSchemaStream() {
  let chatMessageRef: IChatMessage | null = null;

  const patternExtractor = new PatternExtractor({
    onNormalWrite: (value) => {
      if (!chatMessageRef) return;
      chatMessageRef.content += value;
      appendMarkdown(value, chatMessageRef);
    },
    onHandledWrite: (value) => {
      if (!chatMessageRef) return;
      chatMessageRef.content += value;
      appendSchemaCard(value, chatMessageRef);
    },
  });

  const handleSchemaStream = (content: string, chatMessage: IChatMessage) => {
    if (!content || typeof content !== 'string') return;
    chatMessageRef = chatMessage;
    patternExtractor.handleContent(content);
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
                // 演示示例，使用Math.random作为key
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

然后在你的组件中使用：

```vue
<script setup lang="ts">
import { ref, computed, h, reactive } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue/renderer';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue/config-provider';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { TrBubbleList, TrSender, TrBubbleProvider, BubbleMarkdownContentRenderer } from '@opentiny/tiny-robot';
import { AIClient, GeneratingStatus, STATUS } from '@opentiny/tiny-robot-kit';
import type { ChatMessage } from '@opentiny/tiny-robot-kit';
import '@opentiny/tiny-robot/dist/style.css';
import type { IRendererProps } from '@opentiny/genui-sdk-vue';
import { CustomModelProvider } from './CustomModelProvider'; // 引入上面定义的 CustomModelProvider

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
  <GenuiConfigProvider :materials="materials">
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
          :placeholder="generating ? '思考中...' : '请输入消息'"
          @submit="handleSubmit"
          @cancel="abortRequest"
        />
      </div>
    </div>
  </GenuiConfigProvider>
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

::: tip GenuiRenderer
若无需单独配置物料、需兼容 1.3.0 之前用法，见 [GenuiRenderer Legacy 兼容说明](../components/renderer#兼容组件-genuilegacyrenderer)。
:::

## 其他相关文档

- 查看 [Renderer 组件文档](../components/renderer) 了解详细的 API
- 查看 [自定义组件示例](../examples/renderer/custom-components) 学习如何创建自定义组件
- 查看 [自定义操作示例](../examples/renderer/custom-actions) 学习如何创建自定义操作
