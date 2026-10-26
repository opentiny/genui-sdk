# Renderer 组件搭配 TinyRobot 使用

本文介绍如何使用 `GenuiRenderer` 组件自行搭配对话组件如 `TinyRobot`。简单演示了如何搭配具体对话组件来控制消息流、UI 渲染和交互逻辑。

## 安装依赖

:::: tabs
== npm
```bash
npm install @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue @opentiny/tiny-robot@1.0.0-rc.1 @opentiny/tiny-robot-kit@1.0.0-rc.1 dompurify@^3.3.1 markdown-it@^14.1.0
```
== pnpm
```bash
pnpm add @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue @opentiny/tiny-robot@1.0.0-rc.1 @opentiny/tiny-robot-kit@1.0.0-rc.1 dompurify@^3.3.1 markdown-it@^14.1.0
```
== yarn
```bash
yarn add @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue @opentiny/tiny-robot@1.0.0-rc.1 @opentiny/tiny-robot-kit@1.0.0-rc.1 dompurify@^3.3.1 markdown-it@^14.1.0
```
::::

## 基础使用

首先，创建 TinyRobot 1.0 的 `responseProvider`。它接收标准请求体和中止信号，
并返回异步迭代器：

````typescript
import type { ResponseProvider } from '@opentiny/tiny-robot-kit';

export const responseProvider: ResponseProvider = async (request, signal) => {
  const response = await fetch('https://your-chat-backend/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: request.messages, model: 'deepseek-v3.2', stream: true }),
    signal,
  });
  if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);

  return (async function* () {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (!signal.aborted) {
      const { done, value } = await reader.read();
      if (done) return;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') return;
        yield JSON.parse(data);
      }
    }
  })();
};
````

然后在你的组件中使用：

```vue
<script setup lang="ts">
import { computed, defineComponent, h, markRaw, ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue/renderer';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue/config-provider';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import {
  BubbleRenderers,
  TrBubbleList,
  TrSender,
  TrBubbleProvider,
  type BubbleMessage,
} from '@opentiny/tiny-robot';
import { useMessage, type ChatMessage } from '@opentiny/tiny-robot-kit';
import { PatternExtractor } from '@opentiny/genui-sdk-core';
import '@opentiny/tiny-robot/dist/style.css';
import type { IRendererProps } from '@opentiny/genui-sdk-vue';
import { responseProvider } from './responseProvider';

const inputMessage = ref('');
const extractors = new Map<string, PatternExtractor>();
const messageEngine = useMessage({
  responseProvider,
  onCompletionChunk({ turnId, currentMessage, chunk }) {
    const extractorKey = turnId ?? 'default';
    const message = currentMessage as ChatMessage & { messages?: any[] };
    message.messages ??= [];
    let extractor = extractors.get(extractorKey);
    if (!extractor) {
      extractor = new PatternExtractor({
        onNormalWrite(value) {
          const last = message.messages!.at(-1);
          if (last?.type === 'markdown') last.content += value;
          else message.messages!.push({ type: 'markdown', content: value });
        },
        onHandledWrite(value) {
          const last = message.messages!.at(-1);
          if (last?.type === 'schema-card') last.content += value;
          else message.messages!.push({ type: 'schema-card', id: crypto.randomUUID(), content: value });
        },
      });
      extractors.set(extractorKey, extractor);
    }
    extractor.handleContent(String((chunk as any).choices?.[0]?.delta?.content ?? ''));
  },
});
const messages = messageEngine.messages;
const requestState = messageEngine.requestState;
const generating = messageEngine.isProcessing;
const sendMessage = (content: string) => messageEngine.send({ role: 'user', content });
const abortRequest = () => messageEngine.abortRequest();

const lastSchemaCardId = computed(() => {
  const lastMsg = messages.value[messages.value.length - 1];
  if (lastMsg?.role !== 'assistant') return null;
  const contents = (lastMsg as any).messages;
  if (!Array.isArray(contents) || !contents.length) return null;
  const schemaCard = contents.find((m: any) => m.type === 'schema-card');
  return schemaCard?.id || null;
});

const SchemaRenderer = markRaw(defineComponent({
  props: { message: Object, contentIndex: Number },
  setup(props) {
    return () => {
      const item = (props.message as any).messages?.[props.contentIndex ?? 0] as IRendererProps;
      return h(GenuiRenderer, {
        ...item,
        generating: lastSchemaCardId.value === item.id && generating.value,
      });
    };
  },
}));
const contentRendererMatches = [
  { find: (_message: BubbleMessage, content: any) => content.type === 'schema-card', renderer: SchemaRenderer },
  { find: (_message: BubbleMessage, content: any) => content.type === 'markdown', renderer: BubbleRenderers.Markdown },
];
const contentResolver = (message: BubbleMessage) => (message as any).messages ?? message.content;

const handleSubmit = (content: string) => {
  sendMessage(content);
};

const roleConfigs = {
  user: {
    placement: 'end',
  },
  assistant: {
    placement: 'start',
  },
};
</script>

<template>
  <GenuiConfigProvider :materials="materials">
    <div class="chat-container">
      <div class="messages-container">
        <TrBubbleProvider :content-renderer-matches="contentRendererMatches">
          <TrBubbleList :messages="messages" :role-configs="roleConfigs" :content-resolver="contentResolver" />
        </TrBubbleProvider>
      </div>
      <div class="sender-container">
        <TrSender
          v-model="inputMessage"
          :loading="generating"
          :placeholder="requestState === 'processing' ? '思考中...' : '请输入消息'"
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

若还需要多会话与持久化，请用官方 `useConversation`，并从
`activeConversation.value?.engine` 取得 `useMessage` 引擎。自动保存默认开启；
`GenuiChat` 可通过 `autoSaveMessages` 在运行时关闭。TinyRobot 0.3.3 写入 IndexedDB
的旧历史记录不会自动迁移到 1.0。

::: tip GenuiRenderer
若无需单独配置物料、需兼容 1.3.0 之前用法，见 [GenuiRenderer Legacy 兼容说明](../components/renderer#兼容组件-genuilegacyrenderer)。
:::

## 其他相关文档

- 查看 [Renderer 组件文档](../components/renderer) 了解详细的 API
- 查看 [自定义组件示例](../examples/renderer/custom-components) 学习如何创建自定义组件
- 查看 [自定义操作示例](../examples/renderer/custom-actions) 学习如何创建自定义操作
