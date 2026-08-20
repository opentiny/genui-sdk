# GenuiConfigProvider Component

`GenuiConfigProvider` provides theme, i18n, and materials configuration for the renderer, and scopes theme styles within a specific container.

When using only ConfigProvider, you can import it on demand from `@opentiny/genui-sdk-vue/config-provider`. See [Quick Start - Subpath Imports](../guide/quick-start#subpath-imports).

When used with `GenuiRenderer` or `GenuiChat`, you typically need to inject component materials via the `materials` prop. See [Materials Configuration](../guide/quick-start#materials-configuration).

## Props

### theme

- **Type**: `'dark' | 'lite' | 'light' | 'auto'`
- **Required**: No
- **Default**: `'light'`
- **Description**: Theme mode.
  - `'dark'`: Dark theme
  - `'lite'`: Lite theme
  - `'light'`: Light theme
  - `'auto'`: Follow the browser preference automatically

```vue
<template>
  <GenuiConfigProvider theme="dark">
    <GenuiChat :url="url" />
  </GenuiConfigProvider>
</template>
```

See [GenuiConfigProvider - Theme Switching](../examples/config-provider/theme) for detailed usage.

### id

- **Type**: `string`
- **Required**: No
- **Default**: `'tiny-genui-config-provider'`
- **Description**: The container element id used for style scoping. When multiple `GenuiConfigProvider` instances exist on the page, set a different id for each.

```vue
<template>
  <GenuiConfigProvider theme="dark" id="my-chat">
    <GenuiChat :url="url" />
  </GenuiConfigProvider>
</template>
```

See [GenuiConfigProvider - Custom Theme](../examples/config-provider/custom-theme) for detailed usage.

### locale

- **Type**: `string`
- **Required**: No
- **Default**: `'zh_CN'`
- **Description**: Sets the component locale. Supported language codes include `'zh_CN'` (Simplified Chinese) and `'en_US'` (English).

```vue
<template>
  <GenuiConfigProvider locale="en_US">
    <GenuiChat :url="url" />
  </GenuiConfigProvider>
</template>
```

### i18n

- **Type**: `I18nMessages`
- **Required**: No
- **Default**: `undefined`
- **Description**: Custom internationalization message object. Used to override or extend default i18n text. Format: `{ [lang: string]: { [key: string]: string | I18nMessageObject } }`.

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

const locale = ref('en_US');

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

See [GenuiConfigProvider - i18n Configuration](../examples/config-provider/i18n) for detailed usage.

### materials

- **Type**: `IMaterials`
- **Required**: No (required when using `GenuiRenderer` / `GenuiChat`)
- **Description**: Component materials for the renderer. Usually pass materials from a materials package, e.g. the `materials` object from `@opentiny/genui-sdk-materials-vue-opentiny-vue`.

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

## Slots

`GenuiConfigProvider` uses the default slot to wrap child components.

### Customizing theme for GenuiChat

```vue
<template>
  <GenuiConfigProvider :theme="theme" id="my-chat">
    <GenuiChat :url="url" />
  </GenuiConfigProvider>
  <button @click="toggleTheme">Toggle theme</button>
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

### Customizing theme for GenuiRenderer

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

Internationalization message object. Keys are language codes (e.g. `'zh_CN'`, `'en_US'`), and values are message objects for that language.

### I18nMessageObject

```typescript
type I18nMessageObject = {
  [key: string]: string | I18nMessageObject;
};
```

Internationalization message object structure supporting nested objects. Keys are message keys; values are strings or nested message objects.
