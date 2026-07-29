# Vue 集成指南

本指南涵盖 将 GenUI SDK 集成到 Vue 3 项目中.

## 安装

### 新项目 (从零开始)

创建新的 Vue 3 项目:

```bash
npm create vue@latest genui-app
cd genui-app
```

### 现有项目

导航到你的现有 Vue 3 项目:

```bash
cd your-project
```

### 安装依赖

安装 GenUI SDK 和官方物料:

```bash
# npm
npm install @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue

# pnpm
pnpm add @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue

# yarn
yarn add @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue
```

## 集成模式 1: GenuiChat (推荐用于 快速开始)

`GenuiChat` 是一个集成的聊天组件，包含会话管理、流式传输和生成状态. 这是最简单的入门方式.

### 步骤 1: 清理默认样式

打开 `src/main.js` 或 `src/main.ts` 并删除默认 CSS 导入:

```javascript
// 删除这一行
import './assets/main.css';

import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
```

### 步骤 2: 配置 App.vue

替换 `src/App.vue` 的内容:

```vue
<script setup lang="ts">
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
</script>

<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat />
  </GenuiConfigProvider>
</template>

<style>
body,
html {
  padding: 0;
  margin: 0;
}
#app {
  position: fixed;
  width: 100vw;
  height: 100vh;
}
.tiny-config-provider {
  height: 100%;
}
</style>
```

### 步骤 3: 配置后端 URL

添加你的后端 URL 和模型配置:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';

const url = 'https://your-chat-backend/api';
const model = ref('deepseek-v3.2');
const temperature = ref(0.7);
</script>

<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat :url="url" :model="model" :temperature="temperature" />
  </GenuiConfigProvider>
</template>
```

### 步骤 4: 添加主题和空状态

配置主题并为空状态添加欢迎消息:

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';

const url = 'https://your-chat-backend/api';
const model = ref('deepseek-v3.2');
const temperature = ref(0.7);
const theme = ref<'dark' | 'lite' | 'light' | 'auto'>('dark');
</script>

<template>
  <GenuiConfigProvider :theme="theme" :materials="materials">
    <GenuiChat :url="url" :model="model" :temperature="temperature">
      <template #empty>
        <div class="empty-text">欢迎使用生成式UI</div>
      </template>
    </GenuiChat>
  </GenuiConfigProvider>
</template>

<style>
body,
html {
  padding: 0;
  margin: 0;
}
#app {
  position: fixed;
  width: 100vw;
  height: 100vh;
}
.tiny-config-provider {
  height: 100%;
}
.empty-text {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 30px;
}
</style>
```

### 步骤 5: 运行项目

```bash
npm run dev
```

## 集成模式 2: GenuiRenderer (自定义 UI)

当你需要更多控制 UI 或想要构建自定义聊天界面时使用 `GenuiRenderer`.

### 步骤 1: 创建流式处理器

创建文件 `fetch-schema-stream.ts` 来处理流式响应:

```typescript
import { PatternExtractor } from '@opentiny/genui-sdk-core';

export async function fetchSchemaStream(
  url: string,
  userInput: string,
  onSchemaUpdate: (schemaChunk: string) => void,
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: userInput }],
      model: 'deepseek-v3.2',
      stream: true,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  const patternExtractor = new PatternExtractor({
    onNormalWrite: () => {},
    onHandledWrite: (value) => onSchemaUpdate(value),
  });

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      while (true) {
        const lineEndIndex = buffer.indexOf('\n');
        if (lineEndIndex === -1) break;

        const line = buffer.slice(0, lineEndIndex).trim();
        buffer = buffer.slice(lineEndIndex + 1);

        if (!line.startsWith('data:')) continue;

        const dataStr = line.slice(5).trim();

        if (dataStr === '[DONE]') {
          return;
        }

        try {
          const chunk = JSON.parse(dataStr);
          const content = chunk.choices?.[0]?.delta?.content;

          if (!content) continue;

          patternExtractor.handleContent(content);
        } catch (e) {
          console.error('解析后端数据失败:', e, dataStr);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
```

### 步骤 2: 创建自定义聊天组件

创建包含输入框、发送按钮和渲染器的 Vue 组件:

```vue
<template>
  <GenuiConfigProvider :materials="materials">
    <div class="demo-container">
      <div class="input-group">
        <input v-model="inputText" placeholder="请输入问题..." @keyup.enter="handleSend" />
        <button @click="handleSend">发送</button>
      </div>
      <GenuiRenderer :content="schema" :key="rendererKey" />
    </div>
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue/renderer';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue/config-provider';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { fetchSchemaStream } from './fetch-schema-stream';

const inputText = ref('');
const schema = ref<any>({ componentName: 'Page', children: [] });
const rendererKey = ref(0);
const generating = ref(false);

const handleSend = async () => {
  if (!inputText.value.trim() || generating.value) return;

  generating.value = true;
  schema.value = '';
  rendererKey.value++;
  const userInput = inputText.value;
  inputText.value = '';

  try {
    await fetchSchemaStream('https://your-chat-backend/api', userInput, (schemaChunk) => {
      schema.value += schemaChunk;
    });
  } catch (error) {
    console.error('请求失败:', error);
  } finally {
    generating.value = false;
  }
};
</script>

<style scoped>
.demo-container {
  padding: 16px;
  box-sizing: border-box;
}

.input-group {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

button {
  padding: 8px 16px;
  background: #1890ff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
```

## 集成模式 3: GenuiRenderer with TinyRobot

For a more feature-rich chat interface, integrate `GenuiRenderer` with `TinyRobot`.

### 步骤 1: Install Additional Dependencies

```bash
npm install @opentiny/tiny-robot @opentiny/tiny-robot-kit
```

### 步骤 2: Create Custom Model Provider

Create `CustomModelProvider.ts`:

```typescript
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
```

### 步骤 3: Create Chat Component

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
import { CustomModelProvider } from './CustomModelProvider';

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
  默认Attrs: { class: 'markdown-content' },
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

## 按需导入

如果你只需要特定组件，使用按需导入来减小打包体积:

```typescript
// 仅 Chat 组件
import { GenuiChat } from '@opentiny/genui-sdk-vue/chat';

// 仅 Renderer 组件
import { GenuiRenderer } from '@opentiny/genui-sdk-vue/renderer';

// 仅 ConfigProvider
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue/config-provider';
```

## 兼容组件

对于从 1.3.0 之前版本升级的项目，你可以使用包含内置物料的兼容组件:

```vue
<script setup lang="ts">
import { GenuiLegacyChat as GenuiChat } from '@opentiny/genui-sdk-vue/legacy-chat';
// or
import { GenuiLegacyRenderer as GenuiRenderer } from '@opentiny/genui-sdk-vue/legacy-renderer';
</script>
```

## 常见问题

### 物料未注入

**问题**: 组件无法正确渲染

**解决方案**: 确保你已经用 `GenuiConfigProvider` 包装组件并注入了物料:

```vue
<GenuiConfigProvider :materials="materials">
  <!-- Your components here -->
</GenuiConfigProvider>
```

### 流式不工作

**问题**: UI 在流式传输期间不更新

**解决方案**: 
1. 检查你的后端是否返回带 `data:` 前缀的 SSE 格式
2. 确保你正在使用 `PatternExtractor` 从响应中提取 schema
3. 验证 `GenuiRenderer` 上的 `generating` prop 是否正确设置

## 下一步

- 了解 [自定义组件](../examples/renderer/custom-components.md)
- 探索 [自定义动作](../examples/renderer/custom-actions.md)
- 配置 [必需完整字段选择器](../examples/renderer/required-complete-field-selectors.md) 以获得更好的流式体验
- 查看 [状态管理示例](../examples/renderer/state.md)
