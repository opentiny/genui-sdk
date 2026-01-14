# ConfigProvider 组件

`ConfigProvider` 用于为渲染器提供主题能力，并将主题样式限定在特定作用域内。

## Props

### theme

- **类型**: `'dark' | 'lite' | 'default'`
- **必填**: 否
- **默认值**: `'default'`
- **说明**: 主题模式。

```vue
<template>
  <ConfigProvider theme="dark">
    <GenuiChat :url="url" />
  </ConfigProvider>
</template>
```

### id

- **类型**: `string`
- **必填**: 否
- **默认值**: `'tiny-genui-config-provider'`
- **说明**: 容器元素的 id，用于样式作用域隔离。当页面中有多个 ConfigProvider 实例时，需要设置不同的 id。

```vue
<template>
  <ConfigProvider theme="dark" id="my-chat">
    <GenuiChat :url="url" />
  </ConfigProvider>
</template>
```

## Slots

`ConfigProvider` 使用默认插槽包裹子组件。

### 为 GenuiChat 定制主题

```vue
<template>
  <ConfigProvider :theme="theme" id="my-chat">
    <GenuiChat :url="url" />
  </ConfigProvider>
  <button @click="toggleTheme">切换主题</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const theme = ref<'dark' | 'lite' | 'default'>('dark');

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'lite' : 'dark';
}
</script>
```

### 为 SchemaRenderer 定制主题

```vue
<template>
  <ConfigProvider :theme="theme" id="my-schema-renderer">
    <SchemaRenderer :content="content" :generating="generating" />
  </ConfigProvider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { ConfigProvider, SchemaRenderer } from '@opentiny/genui-sdk-vue';

const theme = ref<'dark' | 'lite' | 'default'>('dark');
const content = ref({});
const generating = ref(false);
</script>
```
