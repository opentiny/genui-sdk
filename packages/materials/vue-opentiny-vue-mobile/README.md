# @opentiny/genui-sdk-materials-vue-opentiny-vue-mobile

基于 TinyVue **mobile-first** 模式的 GenUI Vue 移动端物料包。组件名、props 与 PC 物料保持一致，
由 `mode: 'mobile-first'` 驱动 TinyVue 在运行时选用移动端模板。

## 使用

```vue
<script setup>
import { GenuiConfigProvider, GenuiChat } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue-mobile/materials';
</script>

<template>
  <GenuiConfigProvider :materials="materials">
    <GenuiChat ... />
  </GenuiConfigProvider>
</template>
```

`GenuiRenderer` 读取 `materials.mode` 并向渲染子树注入 `TinyMode`，TinyVue 组件据此切换模板。
注入范围只覆盖 schema 渲染内容，聊天输入框等宿主 UI 仍使用 PC 模板。

物料包内已引入 `@opentiny/vue-runtime/dist3/tailwind.css`（TinyVue mobile-first 模板依赖的
Tailwind 工具类），无需额外引入样式。这部分样式是全局的（含 Tailwind preflight），只在
同时使用 PC 物料的应用里建议按需加载。

另外，单包版 `@opentiny/vue-common@3.31.0` 的 `customDesignConfig.twMerge` 是返回空串的
空实现，而 mobile-first 模板的类名都经由它输出，不替换的话组件会丢掉全部动态类（输入框
无边框、图标撑满整行）。物料入口的 `design-config.ts` 会用 `tailwind-merge` 覆盖该实现，
因此 `tailwind-merge` 是运行时依赖，不能省。

## 与 PC 物料的关系

- 复用 `@opentiny/genui-sdk-materials-vue-opentiny-vue` 的组件注册表与物料协议；
- 用移动端白名单收窄 prompt 可用的组件（仅保留 3.31 提供 mobile-first 模板的组件）；
- 额外注册移动端组件：`TinyTabbar`、`TinyTabbarItem`、`TinyActionSheet`、`TinyPullRefresh`、`TinyPopup`。

由于 `mode` 是全局注入的，移动端物料不能与 PC 物料合并使用，需要按组件库切换整包替换。

## 构建

```bash
pnpm --filter @opentiny/genui-sdk-materials-vue-opentiny-vue-mobile build
```
