# 自定义 Renderer

GenUI Chat 支持自定义 Schema Renderer，允许你使用不同的渲染引擎或框架来渲染 Schema。这对于跨框架集成、使用自定义组件库或实现特殊的渲染逻辑非常有用。

## 概述

默认情况下，GenUI SDK 使用 Vue 版本的 `@opentiny/tiny-schema-renderer` 来渲染 Schema。通过自定义 Renderer，你可以：

- 使用 Angular、React 等其他框架的渲染器
- 集成自定义的组件库
- 实现特殊的渲染逻辑或优化
- 支持不同的运行时环境

## 实现自定义 Renderer

自定义 Renderer 需要满足以下接口要求：

### 必需的 Props

- **`schema`** (必需): schemaJson，Chat 组件向 Renderer 传递的 schemaJson

### 必需的方法

自定义 Renderer 组件必须通过 `defineExpose`（Vue 3）或 `expose` 暴露以下方法：

- **`setContext(context: any)`**: 设置渲染上下文，用于在组件中访问外部数据和方法
- **`getContext()`**: 获取当前渲染上下文
- **`setState(state: any)`**: 设置组件状态，用于状态管理

## 在应用中使用自定义 Renderer

### 1. 导入注入关键字

```vue
<script setup>
import { SCHEMA_RENDERER_INJECTION_TOKEN } from '@opentiny/genui-sdk-vue';
import { provide } from 'vue';
import CustomRenderer from './CustomRenderer.vue';

// 提供自定义 Renderer
provide(SCHEMA_RENDERER_INJECTION_TOKEN, CustomRenderer);
</script>
```

### 2. 使用异步组件（推荐）

如果自定义 Renderer 体积较大或需要按需加载，可以使用异步组件：

```vue
<script setup>
import { SCHEMA_RENDERER_INJECTION_TOKEN } from '@opentiny/genui-sdk-vue';
import { provide, defineAsyncComponent } from 'vue';

// 异步加载自定义 Renderer
const CustomRenderer = defineAsyncComponent(() => import('./CustomRenderer.vue').then((m) => m.default));

provide(SCHEMA_RENDERER_INJECTION_TOKEN, CustomRenderer);
</script>
```

## 跨框架集成示例

### 集成 Angular Renderer

以下示例展示了如何在 Vue 应用中集成 Angular 渲染器， `tiny-schema-renderer-element-ng`是将 Angular 渲染器包装成了 webComponent

```vue
<template>
  <tiny-schema-renderer-element-ng ref="rendererRef"></tiny-schema-renderer-element-ng>
</template>

<script setup lang="ts">
import { ref, toRaw, watch } from 'vue';

const props = defineProps<{
  schema: any;
}>();

const rendererRef = ref<HTMLElement>();
let schema: any = null;

watch(
  [() => props.schema, () => rendererRef.value],
  ([newVal, newRendererRef]) => {
    schema = toRaw(newVal);
    if (rendererRef.value && schema.children?.length) {
      setSchema();
    }
  },
  { deep: true },
);

function setSchema() {
  (rendererRef.value as any).schema = schema;
  (rendererRef.value as any).detectChanges();
}

function setState(state: any) {
  return (rendererRef.value as any).setState(state);
}

function setContext(context: any) {
  return (rendererRef.value as any).setContext(context);
}

function getContext() {
  return (rendererRef.value as any).getContext();
}

defineExpose({
  setContext,
  getContext,
  setState,
});
</script>

<style lang="less">
tiny-schema-renderer-element-ng {
  font-size: var(--ti-common-font-size-base);
  font-family: var(--ti-common-font-family);
  color: var(--ti-common-color-text-primary);
  background-color: var(--ti-common-color-bg-white-normal);
  @import (less) 'tiny-schema-renderer-ng/dist/renderer-element/browser/main.css';
}
</style>
```
