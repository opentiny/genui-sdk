# Chat 组件 - 自定义 Snippets

自定义 Snippets 提供了常用的组件组合模式，帮助 LLM 快速生成常见的 UI 结构。需配合提示词让 LLM 输出对应 schemaJson 使用这些片段。

## 片段定义格式

每个 Snippet 需要包含以下字段：

```typescript
type IGenPromptSnippet = NodeSchema;


interface NodeSchema {
  componentName: string;
  props?: Record<string, any>;
  children?: NodeSchema[];
  [key: string]: any;
}
```

- `componentName`: 组件名称
- `props`: 组件属性
- `children`: 子组件数组，用于定义组件组合结构

## 标签页组合示例

以下示例展示了如何使用 `TinyTabs` 和 `TinyTabItem` 组件创建一个标签页组合结构。`TinyTabs` 作为容器组件，`TinyTabItem` 作为标签页项，两者需要搭配使用：

```vue {10-51}
<template>
  <GenuiChat :url="url" :customSnippets="customSnippets" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const customSnippets = [
  {
    componentName: 'TinyTabs',
    props: {
      modelValue: 'tab1',
    },
    children: [
      {
        componentName: 'TinyTabItem',
        props: {
          title: '标签页1',
          name: 'tab1',
        },
        children: [
          {
            componentName: 'div',
            props: {
              style: 'padding: 16px;',
            },
            children: '标签页1的内容',
          },
        ],
      },
      {
        componentName: 'TinyTabItem',
        props: {
          title: '标签页2',
          name: 'tab2',
        },
        children: [
          {
            componentName: 'div',
            props: {
              style: 'padding: 16px;',
            },
            children: '标签页2的内容',
          },
        ],
      },
    ],
  },
];
</script>
```

## 完整示例

<demo vue="../../../demos/chat/custom-snippets.vue" />

