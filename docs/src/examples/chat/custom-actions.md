# Chat 组件 - 自定义 Actions

在 `GenuiChat` 组件中， 内置了一个继续对话的Action `continueChat`，你可以通过 `customActions` prop 传递自定义 Actions，让 AI 可以在生成的 UI 中调用这些动作。

## 基础用法
```vue {14-34}
<template>
  <GenuiChat 
    :url="url" 
    :customActions="customActions"
    :messages="messages"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

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
      {
        name: 'target',
        type: 'string',
        description: '打开方式，可选值：_self（当前窗口）、_blank（新窗口）',
      },
    ],
    execute: (params: any) => {
      window.open(params.url, params.target || '_self');
    },
  },
];

// 默认消息，用于展示自定义 Actions
const messages = [
 // 省略messages
];
</script>
```

## Action 定义格式

每个 Action 需要包含以下字段：

- `name`: Action 名称，在 Schema 中通过 `this.callAction(name, params)` 调用
- `description`: Action 的描述，用于帮助 AI 理解何时使用这个 Action
- `params`: 参数定义数组，每个参数包含 `name`、`type`、`description`
- `execute`: 执行函数（可选，前端实现时使用）

```typescript
interface CustomAction {
  name: string;
  description: string;
  params: Array<{
    name: string;
    type: string;
    description: string;
  }>;
  execute?: (params: any) => void; // 前端实现
}
```

## 在 Schema 中调用 Action

AI 生成的 Schema 可以通过 `JSFunction` 调用这些 Action：

```json
{
  "componentName": "TinyButton",
  "props": {
    "children": "打开新页面",
    "onClick": {
      "type": "JSFunction",
      "value": "function() { this.callAction('openPage', { url: 'https://example.com', target: '_blank' }); }"
    }
  }
}
```

## 完整示例

<demo vue="../../../demos/chat/custom-actions.vue" />
