# @opentiny/genui-sdk-vue


A Vue 3 component library for enhanced LLM display and interaction. Stream AI-generated structured output into OpenTiny interactive UI components with bidirectional conversation support.

* **Streaming Rendering:** Content renders progressively as the model generates—no long waits for full responses.
* **Structured Output:** LLM output conforms to JSON Schema, enabling reliable parsing and rendering.
* **Interaction:** User actions (form submit, button click) feed back into the conversation context for seamless multi-turn flows.

[Learn more about GenUI SDK](https://opentiny.design/genui-sdk).

## Usage

Install together with core and the Vue materials package (the renderer is bundled in the vue package):

```bash
pnpm add @opentiny/genui-sdk-vue @opentiny/genui-sdk-core @opentiny/genui-sdk-materials-vue-opentiny-vue
```

```vue
<script setup>
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
</script>

<template>
  <GenuiConfigProvider theme="dark" :materials="materials">
    <GenuiChat
      url="/api/chat"
      model="deepseek-chat"
    />
  </GenuiConfigProvider>
</template>
```

Import by feature via subpaths (`/chat`, `/renderer`, `/config-provider`, `/code-generator`) to avoid unused modules:

```ts
import { generateCode } from '@opentiny/genui-sdk-vue/code-generator';
```

## Documentation

* [quick-start](https://docs.opentiny.design/genui-sdk/guide/quick-start)
* [start-with-render](https://docs.opentiny.design/genui-sdk/guide/start-with-renderer)

## API

* [GenuiRender](https://docs.opentiny.design/genui-sdk/components/renderer)
* [GenuiChat](https://docs.opentiny.design/genui-sdk/components/chat)
* [GenuiConfigProvider](https://docs.opentiny.design/genui-sdk/components/config-provider)
* [generateCode](https://docs.opentiny.design/genui-sdk/components/code-generator)
