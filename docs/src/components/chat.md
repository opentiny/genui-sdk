# GenuiChat 组件

`GenuiChat` 是一个集成的对话组件，内部封装了会话管理、流式返回、生成状态等功能，提供了开箱即用的对话体验。

## Props

### url

- **类型**: `string`
- **必填**: 是
- **说明**: 后端服务地址，用于请求大模型返回结构化数据。

```vue
<template>
  <GenuiChat url="https://your-chat-backend/api" />
</template>
```

### messages

- **类型**: `IMessage[]`
- **必填**: 否
- **默认值**: `[]`
- **说明**: 初始化的对话上下文。

```vue
<template>
  <GenuiChat :url="url" :messages="initialMessages" />
</template>

<script setup>
const initialMessages = [
  {
    role: 'user',
    content: '你好',
  },
  {
    role: 'assistant',
    content: '你好！有什么可以帮助你的吗？',
    messages: [
      {
        type: 'text',
        content: '你好！有什么可以帮助你的吗？'
      }
    ]
  }
];
</script>
```

### llmConfig

- **类型**: `LLMConfig`
- **必填**: 否
- **说明**: 大模型配置，可以指定大模型、模型温度以及额外的系统提示词。

```vue
<template>
  <GenuiChat :url="url" :llmConfig="llmConfig" />
</template>

<script setup>
const llmConfig = {
  model: 'gpt-4',
  temperature: 0.7,
  prompt: '你是一个专业的助手，请用生成式UI的方式回复用户。'
};
</script>
```

### config

- **类型**: `IGenuiConfig`
- **必填**: 否
- **说明**: GenUI 相关配置。

```vue
<template>
  <GenuiChat :url="url" :config="genuiConfig" />
</template>

<script setup>
const genuiConfig = {
  addToolCallContext: true,  // 是否添加工具调用上下文
  showThinkingResult: true,   // 是否显示思考结果
};
</script>
```

### customConfig

- **类型**: `ICustomConfig`
- **必填**: 否
- **说明**: 自定义配置，包括自定义组件、片段、示例、动作等。

```vue
<template>
  <GenuiChat :url="url" :customConfig="customConfig" />
</template>

<script setup>
const customConfig = {
  customComponentsSchema: [],  // 自定义组件schema
  customSnippets: [],          // 自定义片段
  customExamples: [],          // 自定义示例
  customActions: []            // 自定义动作
};
</script>
```

### rendererSlots

- **类型**: `IRendererSlots`
- **必填**: 否
- **说明**: 传递给 SchemaRenderer 的插槽。

```vue
<template>
  <GenuiChat :url="url" :rendererSlots="rendererSlots" />
</template>

<script setup>
const rendererSlots = {
  header: (props) => h('div', '自定义头部'),
  footer: (props) => h('div', '自定义底部')
};
</script>
```

### thinkComponent

- **类型**: `Component<BubbleProps>`
- **必填**: 否
- **说明**: 自定义思考过程组件。

```vue
<template>
  <GenuiChat :url="url" :thinkComponent="CustomThinkComponent" />
</template>

<script setup>
import CustomThinkComponent from './CustomThinkComponent.vue';
</script>
```

### roles

- **类型**: `IRolesConfig`
- **必填**: 否
- **说明**: 自定义角色配置，包括用户和助手的头像、样式等。

```vue
<template>
  <GenuiChat :url="url" :roles="rolesConfig" />
</template>

<script setup>
const rolesConfig = {
  user: {
    maxWidth: '80%',
    // 其他TinyRobot的BubbleRoleConfig配置
  },
  assistant: {
    maxWidth: '100%',
    // 其他TinyRobot的BubbleRoleConfig配置
  }
};
</script>
```

### features

- **类型**: `ModelCapability`
- **必填**: 否
- **说明**: 模型能力配置，如是否支持图片上传、函数调用等。

```vue
<template>
  <GenuiChat :url="url" :features="modelFeatures" />
</template>

<script setup>
const modelFeatures = {
  supportImage: {
    enabled: true,
    maxImageSize: 10,  // MB
    maxFilesPerRequest: 3,
    supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp']
  },
  supportFunctionCalling: true
};
</script>
```

## Methods

### clearConversation()

- **说明**: 中断当前对话并清空会话。

```vue
<template>
  <GenuiChat ref="chatRef" :url="url" />
  <button @click="clearAll">清空会话</button>
</template>

<script setup>
import { ref } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

function clearAll() {
  chatRef.value?.clearConversation();
}
</script>
```

## Slots

`GenuiChat` 组件内部使用了 TinyRobot 的组件，可以通过插槽自定义部分内容。具体可参考 TinyRobot 的文档。

## Events

`GenuiChat` 组件内部管理了所有事件，不直接对外暴露事件。如需监听特定事件，可以通过 `customActions` 或 `customConfig` 进行扩展。

## Types

### IMessage

```typescript
interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  messages?: IMessageItem[];  // 自定义显示内容
}

interface IMessageItem {
  type: string;
  content: string;
  [customKey: string]: any;
}
```

### LLMConfig

```typescript
interface LLMConfig {
  model: string;
  temperature: number;
  prompt?: string;
}
```

### IGenuiConfig

```typescript
interface IGenuiConfig {
  addToolCallContext?: boolean;  // 是否添加工具调用上下文
  showThinkingResult?: boolean;  // 是否显示思考结果
}
```

### ICustomConfig

```typescript
interface ICustomConfig {
  customComponentsSchema?: any[];  // 自定义组件schema数组
  customSnippets?: any[];          // 自定义片段数组
  customExamples?: any[];          // 自定义示例数组
  customActions?: any[];           // 自定义动作数组
}
```

### ModelCapability

```typescript
interface ModelCapability {
  supportImage?: ImageFeatures;
  supportFunctionCalling?: boolean;
  [key: string]: any;
}

interface ImageFeatures {
  enabled: boolean;
  maxImageSize: number;        // MB
  maxFilesPerRequest: number;
  supportedFileTypes: string[];
}
```

## 完整示例

```vue
<template>
  <GenuiChat
    ref="chatRef"
    url="https://your-chat-backend/api"
    :messages="initialMessages"
    :llmConfig="llmConfig"
    :config="genuiConfig"
    :customConfig="customConfig"
    :features="modelFeatures"
    :thinkComponent="CustomThinkComponent"
    :roles="rolesConfig"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import CustomThinkComponent from './CustomThinkComponent.vue';

const chatRef = ref<InstanceType<typeof GenuiChat> | null>(null);

const initialMessages = [];
const llmConfig = {
  model: 'gpt-4',
  temperature: 0.7,
  prompt: '你是一个专业的助手'
};
const genuiConfig = {
  addToolCallContext: true,
  showThinkingResult: true
};
const customConfig = {
  customComponentsSchema: [],
  customSnippets: [],
  customExamples: [],
  customActions: []
};
const modelFeatures = {
  supportImage: {
    enabled: true,
    maxImageSize: 10,
    maxFilesPerRequest: 3,
    supportedFileTypes: ['jpg', 'jpeg', 'png']
  }
};
const rolesConfig = {
  user: { maxWidth: '80%' },
  assistant: { maxWidth: '100%' }
};
</script>
```
