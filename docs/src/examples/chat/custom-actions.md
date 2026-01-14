# Chat 组件 - 自定义 Actions

在 `GenuiChat` 组件中，你可以通过 `customConfig` 传递自定义 Actions，让 AI 可以在生成的 UI 中调用这些动作。

## 基础用法

```vue
<template>
  <GenuiChat :url="url" :customConfig="customConfig" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customConfig = {
  customActions: [
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
  ],
};
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

## 常见 Action 示例

### 继续对话

```vue
<script setup>
const customConfig = {
  customActions: [
    {
      name: 'continueChat',
      description: '继续对话，用于表单的提交按钮等',
      params: [
        {
          name: 'message',
          type: 'string',
          description: '对话消息，可以是按钮文本等，也可以是其他内容',
        },
      ],
      execute: (params: any) => {
        // 这个 Action 通常由组件内部处理
        // 不需要额外实现
      },
    },
  ],
};
</script>
```

### 打开新页面

```vue
<script setup>
const customConfig = {
  customActions: [
    {
      name: 'openPage',
      description: '打开新页面，用于页面跳转',
      params: [
        {
          name: 'url',
          type: 'string',
          description: '目标页面URL或路径',
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
  ],
};
</script>
```

### 显示通知

```vue
<script setup>
const customConfig = {
  customActions: [
    {
      name: 'showNotification',
      description: '显示通知消息',
      params: [
        {
          name: 'message',
          type: 'string',
          description: '通知消息内容',
        },
        {
          name: 'type',
          type: 'string',
          description: '通知类型：success、error、warning、info',
        },
      ],
      execute: (params: any) => {
        // 使用你的通知组件
        console.log(`[${params.type || 'info'}] ${params.message}`);
        // 例如：Notify({ message: params.message, type: params.type });
      },
    },
  ],
};
</script>
```

### 提交表单

```vue
<script setup>
const customConfig = {
  customActions: [
    {
      name: 'submitForm',
      description: '提交表单数据',
      params: [
        {
          name: 'formData',
          type: 'object',
          description: '表单数据对象',
        },
        {
          name: 'apiUrl',
          type: 'string',
          description: '提交数据的API地址',
        },
      ],
      execute: async (params: any) => {
        try {
          const response = await fetch(params.apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params.formData),
          });
          const result = await response.json();
          console.log('提交成功:', result);
        } catch (error) {
          console.error('提交失败:', error);
        }
      },
    },
  ],
};
</script>
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

## 注意事项

1. **后端配置**：`customActions` 会通过 `metadata.tinygenui` 传递给后端，后端需要处理这些 Action 定义
2. **执行函数**：`execute` 函数只在前端使用，不会传递给后端
3. **Action 名称**：确保 Action 名称唯一且有意义
4. **参数描述**：详细的参数描述有助于 AI 正确使用这些 Action
