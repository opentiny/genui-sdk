# @opentiny/genui-sdk-vue


A Vue 3 component library for enhanced LLM display and interaction. Stream AI-generated structured output into OpenTiny interactive UI components with bidirectional conversation support.

* **Streaming Rendering:** Content renders progressively as the model generates—no long waits for full responses.
* **Structured Output:** LLM output conforms to JSON Schema, enabling reliable parsing and rendering.
* **Interaction:** User actions (form submit, button click) feed back into the conversation context for seamless multi-turn flows.

[Learn more about GenUI SDK](https://opentiny.design/genui-sdk).

## Usage

```vue
<script setup>
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
</script>

<template>
  <GenuiConfigProvider theme="dark">
    <GenuiChat
      url="/api/chat"
      model="deepseek-chat"
    />
  </GenuiConfigProvider>
</template>
```
## Documentation

* [quick-start](https://docs.opentiny.design/genui-sdk/guide/quick-start)
* [start-with-render](https://docs.opentiny.design/genui-sdk/guide/start-with-renderer)

## API

* [GenuiRender](https://docs.opentiny.design/genui-sdk/components/renderer)
* [GenuiChat](https://docs.opentiny.design/genui-sdk/components/chat)
* [GenuiConfigProvider](https://docs.opentiny.design/genui-sdk/components/config-provider)