# Chat Component - Image Upload

The `GenuiChat` component supports image upload, allowing users to upload images in conversations. Configure image upload via `features.supportImage` and pair it with an LLM that supports image processing.

## Configuration Options

```typescript
interface ImageFeatures {
  enabled: boolean; // Whether image upload is enabled
  maxImageSize: number; // Maximum size per image (MB)
  maxFilesPerRequest: number; // Maximum number of images per request
  supportedFileTypes: string[]; // Supported image formats
}
```

## Basic Usage

Set `supportImage.enabled` to `true` to enable and configure image upload:

```vue {10-16}
<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat :url="url" :features="modelFeatures" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

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

## Data Format Accepted by the LLM

After upload, the data structure follows the OpenAI-compatible format. The messageItem passed to the LLM looks like this:

```json
{
  "role": "user",
  "content": [
    { "type": "image_url", "filename": "circle.png", "image_url": { "url": "data:image/png;base64,XXXXXXXXXXX" } },
    { "type": "text", "text": "Analyze this image" }
  ]
}
```

## Full Example

<demo vue="../../../../demos/en/chat/image-upload.vue" />
