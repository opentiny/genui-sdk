# Chat 组件 - 上传图片

`GenuiChat` 组件支持图片上传功能，允许用户在对话中上传图片，通过`features.supportImage` 配置图片上传能力，搭配支持图片处理的 LLM 即可体验。

## 配置选项

```typescript
interface ImageFeatures {
  enabled: boolean; // 是否启用图片上传
  maxImageSize: number; // 单张图片最大大小（MB）
  maxFilesPerRequest: number; // 每次请求最多上传的图片数量
  supportedFileTypes: string[]; // 支持的图片格式
}
```

## 基础用法

配置 `supportImage.enabled` 为 `true` 可以启用和配置图片上传功能：

```vue {10-16}
<template>
  <GenuiChat :url="url" :features="modelFeatures" />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const modelFeatures = {
  supportImage: {
    enabled: true,
    maxImageSize: 10, // MB
    maxFilesPerRequest: 3,
    supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'tiff'],
  },
};
</script>
```

## LLM 接受数据格式

图片上传后，数据结构符合 OpenAI 兼容格式，具体传递给 LLM 的 messageItem 结构如下：

```json
{
  "role": "user",
  "content": [
    { "type": "image", "filename": "circle.png", "image": "data:image/png;base64,XXXXXXXXXXX" },
    { "type": "text", "text": "分析一下这张图片" }
  ]
}
```

## 完整示例

<demo vue="../../../demos/chat/image-upload.vue" />
