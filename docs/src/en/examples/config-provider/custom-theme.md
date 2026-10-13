# GenuiConfigProvider - Custom Theme

`GenuiConfigProvider` supports custom themes via CSS variables. Override CSS variables from TinyRobot and the component library to customize visuals.

## Basic Usage

Use the `id` prop on `GenuiConfigProvider` to create a scoped container, then define custom variables in the matching CSS scope:

```vue {22-43}
<template>
  <div class="app">
    <GenuiConfigProvider :materials="materials" theme="light" id="my-custom-theme">
      <div class="my-custom-theme">
        <GenuiChat :url="url" model="deepseek-v3.2" :messages="messages" />
      </div>
    </GenuiConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const messages = [
  // messages omitted
];
</script>

<style>
#my-custom-theme .tg-chat-container {
  background-color: #f5f3ff;
}
#my-custom-theme .tiny-button {
  /* Custom primary button colors - purple theme */
  --tv-Button-bg-color-primary: #8b5cf6;
  --tv-Button-border-color-primary: #8b5cf6;
  --tv-Button-text-color-primary: #ffffff;
  --tv-Button-icon-color-primary: #ffffff;
  --tv-Button-bg-color-active-primary: #7c3aed;
  --tv-Button-border-color-active-primary: #7c3aed;
  /* Custom button border radius */
  --tv-Button-border-radius: 16px;
}
#my-custom-theme {
  /* Custom Tiny-Robot theme colors */
  --tr-text-primary: #8b5cf6;

  /* Custom Tiny-Robot bubble styles */
  --tr-bubble-content-border-radius: 16px;
  --tr-bubble-content-padding: 20px 28px;
}
</style>
```

## TinyRobot Theme Customization

See the [TinyRobot theme configuration guide](https://docs.opentiny.design/tiny-robot/guide/theme-config.html) for more options.

## TinyVue Component Theme Customization

See [component design tokens](https://opentiny.design/tiny-vue/zh-CN/os-theme/components/button#token) for per-component theming.

Or edit [base variables in vars.less](https://github.com/opentiny/tiny-vue/blob/dev/packages/theme/src/base/vars.less) to theme all components globally.

## Full Example

<demo vue="../../../../demos/en/config-provider/custom-theme.vue" />
