# Chat 组件 - 上传图片

`GenuiChat` 组件支持图片上传功能，允许用户在对话中上传图片。

## 启用图片上传

通过 `features` prop 可以启用和配置图片上传功能：

```vue
<template>
  <GenuiChat
    :url="url"
    :features="modelFeatures"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const modelFeatures = {
  supportImage: {
    enabled: true,
    maxImageSize: 10,        // MB
    maxFilesPerRequest: 3,
    supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'tiff']
  }
};
</script>
```

## 配置选项

### ImageFeatures

```typescript
interface ImageFeatures {
  enabled: boolean;              // 是否启用图片上传
  maxImageSize: number;          // 单张图片最大大小（MB）
  maxFilesPerRequest: number;    // 每次请求最多上传的图片数量
  supportedFileTypes: string[];  // 支持的图片格式
}
```

### 默认配置

```typescript
const DEFAULT_IMAGE_FEATURES: ImageFeatures = {
  enabled: true,
  maxImageSize: 10,
  maxFilesPerRequest: 3,
  supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'tiff']
};
```

## 基础用法

```vue
<template>
  <GenuiChat
    :url="url"
    :features="imageFeatures"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const imageFeatures = {
  supportImage: {
    enabled: true,
    maxImageSize: 5,
    maxFilesPerRequest: 2,
    supportedFileTypes: ['jpg', 'jpeg', 'png']
  }
};
</script>
```

## 自定义配置示例

### 限制图片大小和数量

```vue
<template>
  <GenuiChat
    :url="url"
    :features="strictImageFeatures"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

// 严格限制：单张最大 2MB，每次最多 1 张，只支持 jpg 和 png
const strictImageFeatures = {
  supportImage: {
    enabled: true,
    maxImageSize: 2,
    maxFilesPerRequest: 1,
    supportedFileTypes: ['jpg', 'jpeg', 'png']
  }
};
</script>
```

### 宽松配置

```vue
<template>
  <GenuiChat
    :url="url"
    :features="looseImageFeatures"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

// 宽松配置：单张最大 20MB，每次最多 5 张，支持所有格式
const looseImageFeatures = {
  supportImage: {
    enabled: true,
    maxImageSize: 20,
    maxFilesPerRequest: 5,
    supportedFileTypes: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'heic', 'tiff', 'svg']
  }
};
</script>
```

## 禁用图片上传

```vue
<template>
  <GenuiChat
    :url="url"
    :features="noImageFeatures"
  />
</template>

<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

// 方式1：设置 enabled 为 false
const noImageFeatures1 = {
  supportImage: {
    enabled: false
  }
};

// 方式2：不设置 supportImage
const noImageFeatures2 = {
  // 不设置 supportImage
};
</script>
```

## 图片处理流程

1. **用户选择图片**：用户通过文件选择器选择图片
2. **文件验证**：组件会验证文件大小、格式、数量
3. **文件处理**：图片会被转换为 base64 或上传到服务器
4. **添加到消息**：图片会被添加到用户消息中
5. **发送给后端**：包含图片的消息会被发送给后端 API

## 后端处理

后端需要能够处理包含图片的消息。图片通常以 base64 格式或 URL 形式包含在消息中：

```json
{
  "role": "user",
  "content": "请分析这张图片",
  "messages": [
    {
      "type": "text",
      "content": "请分析这张图片"
    },
    {
      "type": "image",
      "content": "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    }
  ]
}
```

## 完整示例

<demo vue="../../../demos/chat/image-upload.vue" />

## 错误处理

组件会自动处理以下错误情况：

- **文件过大**：如果文件超过 `maxImageSize`，会显示错误提示
- **格式不支持**：如果文件格式不在 `supportedFileTypes` 中，会显示错误提示
- **数量超限**：如果选择的文件数量超过 `maxFilesPerRequest`，会显示错误提示

## 注意事项

1. **文件大小**：确保 `maxImageSize` 设置合理，过大的图片会影响上传和传输速度
2. **格式支持**：确保 `supportedFileTypes` 中的格式是后端 API 支持的格式
3. **数量限制**：根据后端 API 的能力设置 `maxFilesPerRequest`
4. **性能考虑**：大量或大尺寸的图片可能会影响性能，建议进行适当的限制
5. **后端支持**：确保后端 API 能够处理包含图片的消息
