# ConfigProvider 组件 - 自定义主题

`ConfigProvider` 组件支持通过 CSS 变量自定义主题样式。你可以通过覆盖 TinyRobot 以及对应物料组件库提供的 CSS 变量来定制组件的视觉效果。

## 基础用法

通过 `ConfigProvider` 的 `id` 属性创建一个作用域，然后在对应的 CSS 作用域中定义自定义变量：

```vue {22-43}
<template>
  <div class="app">
    <ConfigProvider theme="default" id="my-custom-theme">
      <div class="my-custom-theme">
        <GenuiChat :url="url" model="deepseek-v3.2" :messages="messages" />
      </div>
    </ConfigProvider>
  </div>
</template>

<script setup lang="ts">
import { ConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';

const url = 'https://your-chat-backend/api';

const messages = [
  // 省略messages
];
</script>

<style>
#my-custom-theme .tg-chat-container {
  background-color: #f5f3ff;
}
#my-custom-theme .tiny-button {
  /* 自定义按钮 Primary 主题颜色 - 使用紫色系 */
  --tv-Button-bg-color-primary: #8b5cf6;
  --tv-Button-border-color-primary: #8b5cf6;
  --tv-Button-text-color-primary: #ffffff;
  --tv-Button-icon-color-primary: #ffffff;
  --tv-Button-bg-color-active-primary: #7c3aed;
  --tv-Button-border-color-active-primary: #7c3aed;
  /* 自定义按钮圆角 */
  --tv-Button-border-radius: 16px;
}
#my-custom-theme {
  /* 自定义 Tiny-Robot 主题颜色 */
  --tr-text-primary: #8b5cf6;

  /* 自定义 Tiny-Robot 气泡样式 */
  --tr-bubble-content-border-radius: 16px;
  --tr-bubble-content-padding: 20px 28px;
}
</style>
```

## TinyRobot 相关主题定制

查看[TinyRobot 组件主题](https://docs.opentiny.design/tiny-robot/guide/theme-config.html)定制文档了解更多主题定制玩法

## TinyVue 相关组件主题定制

查看[组件文档 Token](https://opentiny.design/tiny-vue/zh-CN/os-theme/components/button#token)了解定制对应组件主题

或者直接修改[基础变量 base/vars.less](https://github.com/opentiny/tiny-vue/blob/dev/packages/theme/src/base/vars.less)css var 变量定制所有组件主题

## 完整示例

<demo vue="../../../demos/config-provider/custom-theme.vue" />
