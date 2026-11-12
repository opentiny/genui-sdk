# @opentiny/genui-sdk-materials-vue-opentiny-vue-mobile

基于 TinyVue **mobile-first** 模式的 GenUI Vue 移动端物料包。组件名、props 与 PC 物料保持一致。
包内不依赖、也不修改 `genui-sdk-core` / `genui-sdk-vue` 的代码，移动端模板的开启方式见下文。

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

TinyVue 组件通过 `inject('TinyMode')` 决定使用 PC 还是 mobile-first 模板。物料包的
`themeFactory` 会注册一个主题 root（`GenuiConfigProvider` 用 `materials.themeFactory` 渲染它），
root 在 `setup` 里 `provide('TinyMode', 'mobile-first')`，覆盖整个 `GenuiConfigProvider` 子树。

因此物料必须配合 `GenuiConfigProvider` 使用；直接渲染 `GenuiRenderer` 时没有这层 root，
TinyVue 会回退到 PC 模板。

物料包内已引入 `@opentiny/vue-runtime/dist3/tailwind.css`（TinyVue mobile-first 模板依赖的
Tailwind 工具类），无需额外引入样式。这部分样式是全局的（含 Tailwind preflight），只在
同时使用 PC 物料的应用里建议按需加载。

另外，单包版 `@opentiny/vue-common@3.31.0` 的 `customDesignConfig.twMerge` 是返回空串的
空实现，而 mobile-first 模板的类名都经由它输出，不替换的话组件会丢掉全部动态类（输入框
无边框、图标撑满整行）。物料入口的 `design-config.ts` 会用 `tailwind-merge` 覆盖该实现，
因此 `tailwind-merge` 是运行时依赖，不能省。

## 与 PC 物料的关系

- 物料协议与 PC 物料包一致（组件名、props、白名单格式），组件直接取自 `@opentiny/vue-*`；
- 用移动端白名单收窄 prompt 可用的组件（仅保留 3.31 提供 mobile-first 模板的组件）；
- 额外注册移动端组件：`TinyActionSheet`、`TinyPullRefresh`、`TinyPopup`。

由于 `TinyMode` 注入作用于整个 `GenuiConfigProvider` 子树，移动端物料不能与 PC 物料合并使用，
需要按组件库切换整包替换。

## 宽度适配

TinyVue mobile-first 的 `TinyCard` 默认带固定宽度（`size-medium` → `w-96`，384px），在 360/390
宽的手机上会撑出横向滚动。物料在 `defaultPropsMap` 里默认 `TinyCard.auto-width = true`，让卡片
跟随容器宽度；模型显式传 `auto-width` 时以传入值为准。

其余常用组件（表单、选择器、标签页、轮播、分页、折叠等）在 360/390 宽下检查过无横向溢出。

## 构建

```bash
pnpm --filter @opentiny/genui-sdk-materials-vue-opentiny-vue-mobile build
```
