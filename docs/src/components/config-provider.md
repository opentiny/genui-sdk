# GenuiConfigProvider 组件

`GenuiConfigProvider` 用于为渲染器提供主题能力，并将主题样式限定在特定作用域内。

## Props

### theme

- **类型**: `'dark' | 'lite' | 'light'`
- **必填**: 否
- **默认值**: `'light'`
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

### locale

- **类型**: `string`
- **必填**: 否
- **默认值**: `'zh_CN'`
- **说明**: 设置组件的语言环境。支持的语言代码包括 `'zh_CN'`（简体中文）和 `'en_US'`（英文）。

```vue
<template>
  <GenuiConfigProvider locale="en_US">
    <GenuiChat :url="url" />
  </GenuiConfigProvider>
</template>
```

### i18n

- **类型**: `I18nMessages`
- **必填**: 否
- **默认值**: `undefined`
- **说明**: 自定义国际化消息对象。用于覆盖或扩展默认的国际化文本。格式为 `{ [lang: string]: { [key: string]: string | I18nMessageObject } }`。

```vue
<template>
  <GenuiConfigProvider :locale="locale" :i18n="customI18n">
    <GenuiChat :url="url" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import type { I18nMessages } from '@opentiny/genui-sdk-vue';

const locale = ref('zh_CN');

const customI18n: I18nMessages = {
  zh_CN: {
    placeholder: {
      input: '请输入您的问题（自定义）',
    },
  },
  en_US: {
    placeholder: {
      input: 'Please enter your question (custom)',
    },
  },
};
</script>
```

查看 [GenuiConfigProvider 组件 - 国际化配置](../examples/config-provider/i18n) 了解详细用法

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

const theme = ref<'dark' | 'lite' | 'light'>('dark');

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

const theme = ref<'dark' | 'lite' | 'light'>('dark');
const content = ref({});
const generating = ref(false);
</script>
```

## Types

### I18nMessages

```typescript
type I18nMessages = {
  [lang: string]: I18nMessageObject;
};
```

国际化消息对象，键为语言代码（如 `'zh_CN'`、`'en_US'`），值为该语言下的消息对象。

### I18nMessageObject

```typescript
type I18nMessageObject = {
  [key: string]: string | I18nMessageObject;
};
```

国际化消息对象结构，支持嵌套对象。键为消息键名，值为字符串或嵌套的消息对象。
