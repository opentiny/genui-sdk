# genui-sdk组件

## SchemaRenderer 渲染组件

渲染 Schema，支持“流式/增量”更新（可传入不完整 JSON 字符串，组件会自动解析并打补丁）。

### Props

- `content: any`：Schema 内容，字符串或对象。字符串时将尝试解析“部分 JSON”。
- `onAction: ({ llmFriendlyMessage, humanFriendlyMessage }) => void`： 可交互按钮点击时执行的回调， `llmFriendlyMessage` 是拼接了当前轮对话中的全局状态的内容 `humanFriendlyMessage`是按钮显示文本。
- `generating: boolean`：标记当前对话是否生成中。

### 代码示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { SchemaRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(true);
const content = ref<string | object>('');

const sendMessage = async ({ llmFriendlyMessage, humanFriendlyMessage }: any) => {
  if (loading.value) {
    return;
  }
  loading.value = true;
  messages.value.push({ role: 'user', content: llmFriendlyMessage, customMessage: humanFriendlyMessage });
  // 省略请求以及返回流处理过程
  const res = await chat(url, messages.value);
  for await (let chunk of res) {
    content.value += chunk;
  }
  loading.value = false;
};
</script>

<template>
  <SchemaRenderer :content="content" :generating="generating" :onAction="sendMessage" />
</template>
```

## GenuiChat 集成的对话组件

封装了`TinyRobot`的对话组件，内部管理了会话信息、流式返回、生成状态等。

### Types

```typescript
interface IMessageItem {
  type: string;
  content: string;
  [customKey: string]: any;
}
interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  messages?: IMessageItem[];
}
```

### Props

- `url: string`：后端服务地址，用于请求大模型返回结构化数据。
- `messsages?: IMessage[]`: 初始化的对话上下文，默认是空数组

### Methods

- `clearConversation()`：中断当前对话并清空会话。

### 示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

function clearAll() {
  chatRef.value?.clearConversation();
}
</script>

<template>
  <GenuiChat url="https://your-chat-backend/api" ref="chatRef" />
  <button @click="clearAll">清空会话</button>
</template>
```

## ConfigProvider 配置组件

### ConfigProvider

- 用途：为渲染器提供主题能力，并将主题样式限定在特定作用域内。
- Props
  - `theme: 'dark' | 'lite' | 'default'`
  - `id?: string`：容器元素 id，默认 `tiny-genui-config-provider`。

### 示例

**为`GenuiChat`定制主题：**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const theme = ref<'dark' | 'lite' | 'default'>('dark');
</script>

<template>
  <ConfigProvider :theme="theme" id="my-chat">
    <GenuiChat />
  </ConfigProvider>
</template>
```

**为`SchemaRenderer`定制主题：**

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { ConfigProvider, SchemaRenderer } from '@opentiny/genui-sdk-vue';

const theme = ref<'dark' | 'lite' | 'default'>('dark');
</script>

<template>
  <ConfigProvider :theme="theme" id="my-schema-renderer">
    <SchemaRenderer />
  </ConfigProvider>
</template>
```
