# Quick Start

This guide helps you get started with GenUI SDK quickly using the `GenuiChat` component.

`GenuiChat` is an integrated chat component with built-in session management, streaming responses, and generation state. It is the simplest way to use generative UI.

## Initialize Project

Create a new Vue project:

```bash
npm create vue@latest genui-chat
```

Follow the default prompts to initialize the project.

## Install Dependencies

Install GenUI SDK in your project directory:

::: tabs
== npm
```bash
cd genui-chat
npm install @opentiny/genui-sdk-vue
```
== pnpm
```bash
cd genui-chat
pnpm add @opentiny/genui-sdk-vue
```
== yarn
```bash
cd genui-chat
yarn add @opentiny/genui-sdk-vue
```
:::

## Subpath Imports

Besides the main entry, `@opentiny/genui-sdk-vue` provides subpath exports. Import only Chat or Renderer when needed to avoid bundling unused modules when tree-shaking is limited.

| Subpath | Use case | Main exports |
| --- | --- | --- |
| `@opentiny/genui-sdk-vue/chat` | Chat only | `GenuiChat` |
| `@opentiny/genui-sdk-vue/renderer` | Renderer only (custom chat UI) | `GenuiRenderer` |
| `@opentiny/genui-sdk-vue/config-provider` | Theme / i18n container only | `GenuiConfigProvider` |

```ts
// Chat only
import { GenuiChat } from '@opentiny/genui-sdk-vue/chat';

// Renderer only
import { GenuiRenderer } from '@opentiny/genui-sdk-vue/renderer';

// Chat + theme
import { GenuiChat } from '@opentiny/genui-sdk-vue/chat';
import { GenuiConfigProvider } from '@opentiny/genui-sdk-vue/config-provider';
```

## Modify Project

### Update `src/main.js` or `src/main.ts`

Remove the default Vue project styles:

```js
import './assets/main.css'; // [!code --]

import { createApp } from 'vue';
import App from './App.vue';

createApp(App).mount('#app');
```

### Update `src/App.vue`

Use the `GenuiChat` component:

```vue
<script setup lang="ts">
import { GenuiChat } from '@opentiny/genui-sdk-vue';
</script>

<template>
  <GenuiChat />
</template>

<style>
body,
html {
  padding: 0;
  margin: 0;
}
#app {
  position: fixed;
  width: 100vw;
  height: 100vh;
}
.tiny-config-provider {
  height: 100%;
}
</style>
```

## Start Development

Run the dev server:

```bash
npm run dev
```

You should now see the GenUI Chat UI in your browser.

## Configure GenuiChat

Configure the LLM via `url`, `model`, and `temperature`:

```vue
<script setup lang="ts">
import { ref } from 'vue'; // [!code ++]
import { GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api'; // [!code ++]
const model = ref('deepseek-v3.2'); // [!code ++]
const temperature = ref(0.7); // [!code ++]
</script>

<template>
  <GenuiChat> <!-- [!code --]-->
  <GenuiChat :url="url" :model="model" :temperature="temperature" />  <!-- [!code ++]-->
</template>
```

## Theme with GenuiConfigProvider

Wrap `GenuiChat` with `GenuiConfigProvider` to set the theme. Built-in options:

- `'dark'`: dark theme
- `'lite'`: fresh theme
- `'light'`: light theme (default)
- `'auto'`: follow system preference

### Basic Usage

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { GenuiChat } from '@opentiny/genui-sdk-vue'; // [!code --]
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue'; // [!code ++]

const url = 'https://your-chat-backend/api';
const model = ref('deepseek-v3.2');
const temperature = ref(0.7);
</script>

<template>
  <!-- [!code ++]-->
  <GenuiConfigProvider theme="dark">
    <GenuiChat :url="url" :model="model" :temperature="temperature" />
    <!-- [!code ++]-->
  </GenuiConfigProvider>
</template>
```

## Empty Slot

Use the `empty` slot for welcome text or suggested prompts when there is no conversation:

```vue
<template>
  <GenuiConfigProvider theme="dark">
    <!-- [!code --]-->
    <GenuiChat :url="url" :model="model" :temperature="temperature" />
    <!-- [!code ++]-->
    <GenuiChat :url="url" :model="model" :temperature="temperature">    
      <!-- [!code ++]-->
      <template #empty>
        <!-- [!code ++]-->
        <div class="empty-text">Welcome to Generative UI</div>
      <!-- [!code ++]-->
      </template>
    <!-- [!code ++]-->
    </GenuiChat>
  </GenuiConfigProvider>
</template>
```

```css
.empty-text { /* [!code ++] */
  height: 100%; /* [!code ++] */
  display: flex; /* [!code ++] */
  justify-content: center; /* [!code ++] */
  align-items: center; /* [!code ++] */
  font-size: 30px; /* [!code ++] */
} /* [!code ++] */
```

### Full Example

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';
const model = ref('deepseek-v3.2');
const temperature = ref(0.7);
const theme = ref<'dark' | 'lite' | 'light' | 'auto'>('dark');
</script>

<template>
  <GenuiConfigProvider :theme="theme">
    <GenuiChat :url="url" :model="model" :temperature="temperature">    
      <template #empty>
        <div class="empty-text">Welcome to Generative UI</div>
      </template>
    </GenuiChat>
  </GenuiConfigProvider>
</template>

<style>
body,
html {
  padding: 0;
  margin: 0;
}
#app {
  position: fixed;
  width: 100vw;
  height: 100vh;
}
.tiny-config-provider {
  height: 100%;
}
.empty-text {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 30px;
}
</style>
```

You are ready to try generative UI.

![Quick start example](../../public/quick-start.png)

## Related Docs

- [GenuiChat API](../components/chat)
- [Using Renderer](start-with-renderer)
- [Examples](../examples/chat/custom-actions)
