# Chat 组件 - 自定义思考过程

`GenuiChat` 组件支持自定义思考过程的显示组件，让用户可以看到 AI 的实时响应状态。

## 基础用法

通过 `thinkComponent` 属性可以自定义思考过程的显示组件。

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

## 接收的 Props

自定义思考组件会接收以下 props：

### `message: IChatMessage`

此轮对话的完整消息对象，类型如下：

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

用于监听流式响应过程中的通知事件， 类型如下：

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

#### palyload 的详细说明

##### 1. `type: 'markdown'`

当 AI 正在生成 Markdown 内容时触发：

```typescript
{
  type: 'markdown';
  delta: IStreamDelta; // 增量数据，包含 content 字段
  chatMessage: IChatMessage; // 完整的消息对象
}
```

**使用场景**：在以生成卡片为目的场景，可以将 markdown 作为思考过程显示

##### 2. `type: 'schema-card'`

当 AI 正在生成 Schema Card（UI 组件）时触发：

```typescript
{
  type: 'schema-card';
  delta: IStreamDelta;
  chatMessage: IChatMessage;
}
```

**使用场景**：显示 "正在生成卡片..." 等提示。

##### 3. `type: 'tool'`

当 AI 正在调用工具时触发：

```typescript
{
  type: 'tool';
  delta: IStreamDelta;
  chatMessage: IChatMessage;
  toolCallData: IToolMessageItem; // 工具调用数据
}
```

`toolCallData` 包含以下字段：

- `name: string` - 工具名称
- `status: 'running' | 'success' | 'failed' | 'cancelled'` - 工具调用状态
- `content: string` - 工具调用的参数和结果（JSON 字符串）

**使用场景**：显示工具调用状态，例如 "正在调用 getWeather...", "已调用 getWeather..."。

##### 4. `type: 'done'`

当流式响应完成时触发：

```typescript
{
  type: 'done';
  delta: IStreamDelta;
  chatMessage: IChatMessage;
}
```

**使用场景**：隐藏加载状态，清理临时数据。

## 示例实现

以下是一个基于实际代码的思考组件实现示例：

```vue
<script lang="ts" setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import type { INotificationPayload } from '@opentiny/genui-sdk-core';
import type { IGeneratingComponentProps } from './common.types';

const props = defineProps<IGeneratingComponentProps>();

const loadingText = ref('响应中...');

const toolStatusTextMap = new Map<string, { text: string }>([
  ['running', { text: '正在调用' }],
  ['success', { text: '已调用' }],
  ['failed', { text: '调用失败' }],
  ['cancelled', { text: '已取消' }],
]);

const handleNotification = (payload: INotificationPayload) => {
  // 响应完成时，清空加载文本
  if (payload.type === 'done') {
    loadingText.value = '';
    return;
  }

  // 正在生成卡片
  if (payload.type === 'schema-card') {
    loadingText.value = '正在生成卡片...';
    return;
  }

  // 如果启用了思考结果显示，显示通用响应中状态
  if (props.showThinkingResult) {
    loadingText.value = '响应中...';
    return;
  }

  // 工具调用状态
  if (payload.type === 'tool') {
    const { toolCallData } = payload;
    loadingText.value = `${toolStatusTextMap.get(toolCallData.status)?.text} ${toolCallData.name}...`;
    return;
  }

  // Markdown 内容生成
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

## 代码说明

### 事件处理逻辑

1. **`done` 事件**：当流式响应完成时，清空 `loadingText`，隐藏组件。

2. **`schema-card` 事件**：当正在生成 UI 组件时，显示 "正在生成卡片..."。

3. **`showThinkingResult` 为 `true`**：如果启用了思考结果显示，统一显示 "响应中..."，不再显示具体的工具调用或内容生成状态。

4. **`tool` 事件**：根据工具调用状态（running、success、failed、cancelled）显示对应的文本，例如 "正在调用 getWeather..."。

5. **`markdown` 事件**：显示最后一条消息的内容预览，例如 "Hello..."。
