# GenuiChat 组件

`GenuiChat` 是一个集成的 TinyRobot 对话组件，内部封装了会话管理、流式返回、生成状态等功能，提供了开箱即用的对话体验。

## Props

### url

- **类型**: `string`
- **必填**: 否
- **说明**: 后端服务地址，用于请求大模型返回结构化数据。

```vue
<template>
  <GenuiChat url="https://your-chat-backend/api" />
</template>
```

### model

- **类型**: `string`
- **必填**: 否
- **说明**: 大模型名称。

```vue
<template>
  <GenuiChat :url="url" model="deepseek-v3.2" />
</template>
```

### temperature

- **类型**: `number`
- **必填**: 否
- **默认值**: `0.3`
- **说明**: 模型温度参数，控制输出的随机性。

```vue
<template>
  <GenuiChat :url="url" model="deepseek-v3.2" :temperature="0.7" />
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
        content: '你好！有什么可以帮助你的吗？',
      },
    ],
  },
];
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
  addToolCallContext: true, // 是否添加工具调用上下文
  showThinkingResult: true, // 是否显示思考结果
};
</script>
```

### customComponents

- **类型**: `ICustomComponentItem[]`
- **必填**: 否
- **说明**: 自定义组件数组，每个组件包含 schema 定义和可选的 ref（组件引用）。

```vue
<template>
  <GenuiChat :url="url" :customComponents="customComponents" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import MyCustomComponent from './MyCustomComponent.vue';

const customComponents = [
  {
    component: 'MyCustomComponent',
    name: '自定义组件',
    description: '这是一个自定义组件',
    schema: {
      properties: [
        {
          property: 'title',
          type: 'string',
          description: '标题',
          required: true,
        },
      ],
    },
    ref: MyCustomComponent, // 组件引用，用于渲染
  },
];
</script>
```

### customSnippets

- **类型**: `IGenPromptSnippet[]`
- **必填**: 否
- **说明**: 自定义片段数组，提供常用的组件组合模式。

```vue
<template>
  <GenuiChat :url="url" :customSnippets="customSnippets" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const customSnippets = [
  {
    componentName: 'TinyForm',
    props: {
      labelPosition: 'top',
    },
    children: [
      {
        componentName: 'TinyFormItem',
        props: { label: '姓名', prop: 'name' },
        children: [
          {
            componentName: 'TinyInput',
            props: { placeholder: '请输入姓名' },
          },
        ],
      },
    ],
  },
];
</script>
```

### customExamples

- **类型**: `IGenPromptExample[]`
- **必填**: 否
- **说明**: 自定义示例数组，提供组件使用示例。

```vue
<template>
  <GenuiChat :url="url" :customExamples="customExamples" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const customExamples = [
  {
    name: '商品卡片示例',
    description: '展示如何使用商品卡片组件',
    schema: {
      componentName: 'ProductCard',
      props: {
        name: 'iPhone 15',
        price: 5999,
      },
    },
  },
];
</script>
```

### customActions

- **类型**: `any[]`
- **必填**: 否
- **说明**: 自定义动作数组，定义可在组件中调用的动作。

```vue
<template>
  <GenuiChat :url="url" :customActions="customActions" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const customActions = [
  {
    name: 'openPage',
    description: '打开新页面',
    params: [
      {
        name: 'url',
        type: 'string',
        description: '目标页面URL',
      },
    ],
    execute: (params: any) => {
      window.open(params.url, '_blank');
    },
  },
];
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
  footer: (props) => h('div', '自定义底部'),
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
import CustomThinkComponent from './custom-think-component.vue';
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
  },
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
    maxImageSize: 10, // MB
    maxFilesPerRequest: 3,
    supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  },
  supportFunctionCalling: true,
};
</script>
```

## Types

### IMessage

```typescript
interface IMessage {
  role: 'user' | 'assistant';
  content: string;
  messages?: IMessageItem[]; // 自定义显示内容
}

interface IMessageItem {
  type: string;
  content: string;
  [customKey: string]: any;
}
```

### IGenuiConfig

```typescript
interface IGenuiConfig {
  addToolCallContext?: boolean; // 是否添加工具调用上下文
  showThinkingResult?: boolean; // 是否显示思考结果
}
```

### ICustomComponentItem

```typescript
interface ICustomComponentItem extends IGenPromptComponent {
  ref?: Component; // 组件引用，用于传给 SchemaRenderer
}

interface IGenPromptComponent {
  component: string; // 组件名
  schema: {
    properties?: IGenPromptComponentProperty[];
    events?: IGenPromptComponentEvent[];
    slots?: Record<string, any>;
  };
  name?: string; // 组件label
  description?: string;
}

interface IGenPromptComponentProperty {
  property: string;
  description: string;
  type: string;
  required?: boolean; // 默认是false
  defaultValue?: any; // 默认是空
  properties?: IGenPromptComponentProperty[];
}

interface IGenPromptComponentEvent {
  type: string;
  functionInfo?: IFunctionInfo;
  defaultValue?: string;
  description: string;
}

interface IFunctionInfo {
  params: IFunctionParam[];
  returns: Record<string, any>;
}

interface IFunctionParam {
  name: string;
  type: string;
  defaultValue: string;
  description: string;
}
```

### IGenPromptSnippet

```typescript
type IGenPromptSnippet = NodeSchema; // NodeSchema 类型

interface NodeSchema {
  componentName: string;
  props?: Record<string, any>;
  children?: NodeSchema[];
  [key: string]: any;
}
```

### IGenPromptExample

```typescript
interface IGenPromptExample {
  name: string;
  description?: string;
  schema: CardSchema;
}

interface CardSchema {
  componentName: 'Page';
  props?: Record<string, any>;
  children?: NodeSchema[];
  [key: string]: any;
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
  maxImageSize: number; // MB
  maxFilesPerRequest: number;
  supportedFileTypes: string[];
}
```

### IRolesConfig

```typescript
interface IRolesConfig {
  user: BubbleRoleConfig; // 用户角色配置
  assistant: BubbleRoleConfig; // 助手角色配置
}

interface BubbleRoleConfig {
  placement?: 'start' | 'end'; // 消息气泡位置
  avatar?: Component | VNode; // 头像组件
  maxWidth?: string; // 消息最大宽度
  slots?: {
    // 插槽配置
    trailer?: Component<IBubbleSlotsProps>; // 底部工具栏组件
  };
}

interface IBubbleSlotsProps {
  index: number;
  bubbleProps: BubbleProps;
  isFinished: boolean;
  messageManager: UseMessageReturn;
}
```

`BubbleProps` 和 `UseMessageReturn` 详情可以查看 TinyRobot 相关文档

查看 [BubbleProps](https://docs.opentiny.design/tiny-robot/guide/bubble.html#props) 定义与用法

查看 [UseMessageReturn](https://docs.opentiny.design/tiny-robot/guide/message.html#%E8%BF%94%E5%9B%9E%E5%80%BC) 定义与用法
