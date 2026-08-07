# Vue 集成指南

本指南涵盖将 GenUI SDK 集成到 Vue 3 项目中的选型与 skill 增量说明。安装与逐步操作见在线文档。

## 集成模式

### 模式 1：GenuiChat（推荐快速开始）

- **概况**：集成对话组件，内置会话管理、流式返回与生成状态；须通过 `GenuiConfigProvider` 注入 `materials`。
- **适用**：最快落地完整 AI 聊天界面。
- **详细步骤**：[快速开始](https://docs.opentiny.design/genui-sdk/guide/quick-start)

### 模式 2：GenuiRenderer（自定义 UI）

- **概况**：仅负责将 schema 渲染为 UI；需自建输入、消息流与 SSE 解析（`PatternExtractor`）。
- **适用**：需要完全自定义界面或与现有 UI 深度集成。
- **详细步骤**：[使用 Renderer 组件](https://docs.opentiny.design/genui-sdk/guide/start-with-renderer)

## 按需导入

`@opentiny/genui-sdk-vue` 提供 `chat`、`renderer`、`config-provider` 等子路径，可按需引入以减小打包体积。详见 [快速开始 - 按需引入](https://docs.opentiny.design/genui-sdk/guide/quick-start#按需引入)。

## 兼容组件

v1.3.0 起物料与核心解耦；从更早版本升级且希望零配置迁移时，可使用内置默认物料的 Legacy 组件（无需 `GenuiConfigProvider`）。详见 [GenuiChat Legacy 兼容说明](https://docs.opentiny.design/genui-sdk/components/chat#兼容组件-genuilegacychat)。

## 常见问题

### 物料未注入

**问题**: 组件无法正确渲染

**解决方案**: 确保你已经用 `GenuiConfigProvider` 包装组件并注入了物料:

```vue
<GenuiConfigProvider :materials="materials">
  <!-- Your components here -->
</GenuiConfigProvider>
```

### 流式不工作

**问题**: UI 在流式传输期间不更新

**解决方案**: 
1. 检查你的后端是否返回带 `data:` 前缀的 SSE 格式
2. 确保你正在使用 `PatternExtractor` 从响应中提取 schema
3. 验证 `GenuiRenderer` 上的 `generating` prop 是否正确设置

## 下一步

- 了解 [自定义组件](../examples/renderer/custom-components.md)
- 探索 [自定义动作](../examples/renderer/custom-actions.md)
- 配置 [必需完整字段选择器](../examples/renderer/required-complete-field-selectors.md) 以获得更好的流式体验
- 查看 [状态管理示例](../examples/renderer/state.md)
