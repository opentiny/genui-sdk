# GenuiConfigProvider 组件

`GenuiConfigProvider` 用于为渲染器提供主题、国际化、物料与自定义 Notify 等配置能力，并将主题样式限定在特定作用域内。

仅使用 ConfigProvider 时可从 `@opentiny/genui-sdk-vue/config-provider` 按需引入，见 [快速开始 - 按需引入](../guide/quick-start#按需引入)。

## Props

### theme

- **类型**: `string`
- **必填**: 否
- **默认值**: `'light'`
- **说明**: 主题模式，接受任意字符串（含 `auto`），由物料包的 `runtimeFactory` 结合系统 `colorScheme` 自行解析。框架层不再限定枚举，不同物料支持的主题集合可能不同，例如 OpenTiny Vue 物料内置 `light` / `dark` / `lite`，Element Plus 物料内置 `light` / `dark`。详见 [物料运行时](./core/api#imaterialsruntime)。
  - `'dark'`：深色主题
  - `'lite'`：清新主题（仅 OpenTiny Vue 物料）
  - `'light'`：浅色主题
  - `'auto'`：自动跟随浏览器

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

- **类型**: `MaterialsLocaleId`（`string`，推荐 `zh_CN`）
- **必填**: 否
- **默认值**: `'zh_CN'`
- **说明**: 设置语言环境，推荐 `语言_地区` 规范 id，不限制为官方枚举。GenUI Chat 内置文案目前提供 `'zh_CN'`、`'en_US'`。物料 `locales` 自行声明支持的 id；组件库自己的 `zh-CN` / `zh-cn` 只存在于物料内部映射表。不要传入 `zh-CN`。

```vue
<template>
  <GenuiConfigProvider :materials="materials" locale="en_US">
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

### materials

- **类型**: `MergedMaterials`（单个 `IMaterials` 也可直接传入）
- **必填**: 否（使用 `GenuiRenderer` / `GenuiChat` 时需要配置）
- **说明**: 渲染器使用的组件物料。通常传入物料包，例如 `@opentiny/genui-sdk-materials-vue-opentiny-vue` 提供的 `materials` 对象。物料可通过 `runtimeFactory` 声明组件库运行时；ConfigProvider 会创建并缓存运行时实例，首次渲染及主题、语言或系统亮暗色变化时调用 `apply()`，并用稳定的 `root` 包裹内容。

```vue
<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiRenderer :content="content" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue/renderer';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue/config-provider';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';

const content = ref({});
</script>
```

### notify

- **类型**: `NotifyHandler`
- **必填**: 否
- **默认值**: `undefined`
- **说明**: 自定义渲染器通知回调。Schema 中 `JSFunction` 解析失败或执行报错时会调用该函数；未配置时使用内置 DOM toast。

```typescript
type NotifyHandler = (options: {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message?: string;
  duration?: number;
}) => void;
```

```vue
<template>
  <GenuiConfigProvider :materials="materials" :notify="handleNotify">
    <GenuiRenderer :content="content" />
  </GenuiConfigProvider>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { GenuiRenderer } from '@opentiny/genui-sdk-vue/renderer';
import { GenuiConfigProvider, type NotifyHandler } from '@opentiny/genui-sdk-vue/config-provider';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';

const content = ref({});

const handleNotify: NotifyHandler = (options) => {
  // 接入业务侧消息组件，例如 TinyNotify / Element Plus ElMessage
  console.log(options.type, options.title, options.message);
};
</script>
```

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

const theme = ref<'dark' | 'lite' | 'light' | 'auto'>('dark');

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

const theme = ref<'dark' | 'lite' | 'light' | 'auto'>('dark');
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

### NotifyHandler

```typescript
type NotifyHandler = (options: {
  type?: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message?: string;
  duration?: number;
}) => void;
```

自定义通知回调类型，见上方 [notify](#notify) 属性。
