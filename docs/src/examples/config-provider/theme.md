# GenuiConfigProvider 组件 - 切换主题

`GenuiConfigProvider` 组件支持主题切换功能，可以在运行时动态切换主题。传入物料后，主题会交给物料的 `runtimeFactory` 解析；同一个稳定的运行时 `root` 同时承载组件库主题和国际化 Provider，切换主题不会重新创建渲染子树。

不同物料包可以支持不同主题。例如 OpenTiny Vue 支持 `light`、`dark`、`lite` 和 `auto`，Element Plus 支持 `light`、`dark` 和 `auto`。自研物料的接入方式见 [物料运行时](../../components/core/api#imaterialsruntime)。

## 为 GenuiChat 配置主题

<demo vue="../../../demos/config-provider/theme.vue" />

## 为 GenuiRenderer 配置主题

<demo vue="../../../demos/config-provider/schema-renderer-theme.vue" />
