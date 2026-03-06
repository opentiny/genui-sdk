# Renderer 组件 - 传递合并 State

通过 `state`，你可以向渲染器传递初始状态，这些状态会在初始化时合并到全局状态中，可以在组件中通过上下文访问。

## 给组件传递 State

通过 `state` 向 `GenuiRenderer` 组件传递初始状态。State 会在组件初始化时合并到全局状态中，**不会动态更新**。

### 应用场景

`state` 主要用于**历史记录回写**场景，当需要回显历史对话中的状态时，可以通过 `state` 传递之前保存的状态数据，让渲染器恢复到之前的状态。

### 基础用法

```vue {12-18}
<template>
  <GenuiRenderer :content="content" :generating="generating" :state="savedState" />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue';

const generating = ref(false);
const content = ref({});

// 从历史记录中恢复的状态
const savedState = {
  formData: {
    name: 'John Doe',
    age: 30,
  },
};
</script>
```

### 在 Action 中访问 State

在自定义 Action 中，可以通过 `context.state` 访问 state：

```vue
<script setup lang="ts">
const customActions = {
  getState: {
    execute: (params: any, context: Record<string, any>) => {
      const state = context.state;
      alert(`全局状态: ${JSON.stringify(state)}`);
    },
  },
};
</script>
```

#### 完整示例：

<demo vue="../../../demos/renderer/state.vue" />

## 注意事项

1. **初始化合并**：State 只在组件初始化时合并到全局状态，后续更新不会生效
2. **历史回显**：主要用于历史记录回写场景，恢复之前保存的状态
3. **数据格式**：State 应该是可序列化的数据，避免存储函数、DOM 元素等
