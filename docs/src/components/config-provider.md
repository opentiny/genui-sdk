# GenuiConfigProvider 组件

`GenuiConfigProvider` 用于为渲染器提供主题能力，并将主题样式限定在特定作用域内。

## Props

### theme

- **类型**: `'dark' | 'lite' | 'default'`
- **必填**: 否
- **默认值**: `'default'`
- **说明**: 主题模式。

```vue
<template>
  <GenuiConfigProvider theme="dark">
    <GenuiChat :url="url" />
  </GenuiConfigProvider>
</template>
```

查看 [GenuiConfigProvider 组件 - 切换主题](../examples/config-provider/theme) 了解详细用法

### id

- **类型**: `string`
- **必填**: 否
- **默认值**: `'tiny-genui-config-provider'`
- **说明**: 容器元素的 id，用于样式作用域隔离。当页面中有多个 GenuiConfigProvider 实例时，需要设置不同的 id。

```vue
<template>
  <GenuiConfigProvider theme="dark" id="my-chat">
    <GenuiChat :url="url" />
  </GenuiConfigProvider>
</template>
```

查看 [GenuiConfigProvider 组件 - 自定义主题](../examples/config-provider/custom-theme) 了解详细用法

## Slots

`GenuiConfigProvider` 使用默认插槽包裹子组件。

### 为 GenuiChat 定制主题

```vue
<template>
  <GenuiConfigProvider :theme="theme" id="my-chat">
    <GenuiChat :url="url" />
  </GenuiConfigProvider>
  <button @click="toggleTheme">切换主题</button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const theme = ref<'dark' | 'lite' | 'default'>('dark');

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'lite' : 'dark';
}
</script>
```

### 为 GenuiRenderer 定制主题

```vue
<template>
  <GenuiConfigProvider :theme="theme" id="my-schema-renderer">
    <GenuiRenderer :content="content" :generating="generating" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-vue';

const theme = ref<'dark' | 'lite' | 'default'>('dark');
const content = ref({});
const generating = ref(false);
</script>
```
