# Chat 组件 - 自定义 Components

在 `GenuiChat` 组件中，你可以通过 `customComponents` prop 传递自定义组件，扩展 LLM 可以使用的组件库。  

## 基础用法

```vue { 16-43 }
<template>
  <GenuiChat
    :url="url"
    :customComponents="customComponents"
    :messages="messages"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
import UserProfile from './components/user-profile.vue';

const url = 'https://your-chat-backend/api';

// 传给 GenuiChat 的自定义组件配置
const customComponents = [
  {
    component: 'UserProfile',
    name: '用户资料',
    description: '显示用户基本信息和头像',
    schema: {
      properties: [
        {
          property: 'name',
          type: 'string',
          description: '用户名称',
          required: true,
        },
        {
          property: 'email',
          type: 'string',
          description: '用户邮箱',
        },
        {
          property: 'avatar',
          type: 'string',
          description: '头像 URL',
        },
      ],
    },
    ref: UserProfile,
  },
];

// 默认消息，用于在对话中展示自定义组件（注意 schema-card 的 schema 结构）
const messages = [
  // 省略messages
];
</script>
```
## LLM返回示例schemaJson如下

```json
{
  "type": "schema-card",
  "componentName": "Page",
  "children": [
    {
      "componentName": "Text",
      "props": {
        "text": "自定义组件示例",
        "style": "font-size: 20px; font-weight: bold; margin-bottom: 16px;"
      }
    },
    {
      "componentName": "UserProfile",
      "props": {
        "name": "John Doe",
        "email": "john@example.com",
        "avatar": "/genui-sdk-docs/logo.svg"
      }
    }
  ]
}
```

当 AI 生成 schema 时，只需要保证 `componentName` 与 `customComponents` 中注册的组件名一致，并按照 `schema` 中约定的字段传 `props` 即可。

## 完整示例

<demo vue="../../../demos/chat/custom-components.vue" :vueFiles="['../../../demos/chat/custom-components.vue',  '../../../demos/chat/components/user-profile.vue']" />
