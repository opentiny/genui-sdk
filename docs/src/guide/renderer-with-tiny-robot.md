# Renderer 组件搭配 TinyRobot 使用

本文介绍如何使用 `GenuiRenderer` 组件自行搭配对话组件如 `TinyRobot`。简单演示了如何搭配具体对话组件来控制消息流、UI 渲染和交互逻辑。

## 安装依赖

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

## 基础使用

> **tiny-robot 0.4.x**：不再使用 `AIClient` + `BaseModelProvider`。请通过 `useConversation` 的 `responseProvider` 对接后端 SSE，并在 `onCompletionChunk` 中处理 schema 流式分片。

首先定义 `responseProvider`，将后端 SSE 转为 tiny-robot 可消费的异步生成器：

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

Schema 分片解析可放在 `onCompletionChunk`（与 `GenuiChat` 内部 `genuiStreamHandler` 思路一致）。完整解析逻辑见 SDK 源码 `chat/genuiStreamHandler.ts`；下方示例仅演示接入方式。

然后在组件中使用 `useConversation` + `GenuiRenderer`：

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
    // onCompletionChunk: genuiStreamHandler.onCompletionChunk, // 生产环境建议复用 SDK 实现
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
        :placeholder="isProcessing ? '思考中...' : '请输入消息'"
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

若不需要自行拼装消息流，可直接使用开箱即用的 [`GenuiChat`](../components/chat)，内部已封装 `responseProvider`、`genuiStreamHandler` 与 Schema 渲染。

## 其他相关文档

- 查看 [Renderer 组件文档](../components/renderer) 了解详细的 API
- 查看 [自定义组件示例](../examples/renderer/custom-components) 学习如何创建自定义组件
- 查看 [自定义操作示例](../examples/renderer/custom-actions) 学习如何创建自定义操作
