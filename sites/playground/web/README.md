# @opentiny/genui-sdk-vue

## 服务端流失文本处理

## SchemaRenderer

用于流式渲染组件，将服务端流失返回的文本拼接传入后，组件会渲染相应的UI。

```html
<script setup>
import { SchemaRenderer } from '@opentiny/genui-sdk-vue';
<script>
<template>
  <SchemaRenderer :content="schemaContent" />
</template>
```

## 完整demo链接

若需要保持对话的连续性，还需自行管理对话上下文和loading处理，此处不再赘述。 具体可以参考demo：链接xxxxxxxxx
