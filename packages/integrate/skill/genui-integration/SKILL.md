---
name: genui-integration
description: genui-sdk 全方位指南：安装、配置、集成、示例。用户提到 genui-sdk、genui-sdk-server，或想构建 AI 聊天界面、动态 UI 组件、Node.js 后端 LLM 代理（OpenAI 兼容 chat/completions API）时使用。涵盖 Vue/Angular 前端（主题、物料、GenuiChat/GenuiRenderer）与 Server 后端（CLI、Express 集成、流式代理）。即使用户只描述需求（如"搭建 LLM 代理服务"、"AI 聊天+动态组件"）而未提及 SDK 名称也应触发。
---

# GenUI SDK 集成指南

本 skill 帮助用户将 GenUI SDK 集成到项目中。GenUI SDK 是一个用于构建由大语言模型（LLM）驱动的生成式 UI 界面的工具包，使 AI 能够动态生成交互式 UI 组件。

## 理解用户需求

在提供集成指导之前，确定：

1. **使用哪个技术栈？** 询问用户使用什么技术：
   - **Vue**（Vue 3 组合式 API）→ 阅读 `references/vue.md`
   - **Angular**（Angular 独立组件）→ 阅读 `references/angular.md`
   - **Server**（Node.js 后端服务）→ 阅读 `references/server.md`
   - **其他框架**（React 等）→ 说明当前仅支持 Vue 和 Angular，建议关注官方更新
   - **多个/全部**（需要全面指导）→ 综合提供所有相关参考

2. **项目状态？** 确定他们是：
   - 从零开始（新项目）→ 提供完整的初始化步骤
   - 添加到现有项目 → 侧重于配置和集成注意事项

3. **使用场景？** 了解他们想要构建什么：
   - 带 AI 的完整聊天界面（使用 `GenuiChat`，仅 Vue）
   - 带流式渲染器的自定义 UI（使用 `GenuiRenderer`）
   - 代理 LLM 调用的后端服务（使用 `genui-sdk-server`）

### 集成模式决策树

根据用户需求，引导他们选择合适的模式：

```
用户需要什么？
├─ 快速开始，完整聊天界面
│  ├─ Vue → GenuiChat（模式 1）
│  └─ Angular → 不支持，建议使用 GenuiRenderer + 自定义聊天外壳
├─ 自定义 UI 布局
│  ├─ Vue → GenuiRenderer（模式 2）
│  └─ Angular → GenuiRenderer（模式 2）
├─ 后端服务
│  └─ 所有框架 → genui-sdk-server（模式 3）
└─ 不确定
   └─ 询问具体需求，然后推荐
```

### 边缘场景处理

- **React 用户**：说明 GenUI SDK 目前仅支持 Vue 和 Angular，建议：
  1. 关注官方 GitHub 仓库了解 React 支持计划
  2. 考虑迁移到 Vue 或 Angular
  3. 参考架构设计，自行实现类似功能

- **TinyVue 配置**：如果用户询问 TinyVue 组件库配置：
  1. 说明 TinyVue 是 GenUI SDK 的物料系统的一部分
  2. 引导查看 `references/materials/index.md` 及 [快速开始 - 物料与主题](https://docs.opentiny.design/genui-sdk/guide/quick-start#通过-genuiconfigprovider-配置物料与主题)
  3. 提供 `GenuiConfigProvider` 的使用示例

- **主题切换**：如果用户询问深色模式或主题：
  1. 说明支持 4 种主题：`dark`、`lite`、`light`、`auto`
  2. 提供 `GenuiConfigProvider` 的 `theme` 属性配置
  3. 引导查看各参考文件的主题配置章节

- **自定义组件**：如果用户想让 AI 使用业务组件：
  1. 说明需要在前端注册组件 + 后端配置 `tinygenui` metadata
  2. 引导查看 `examples/` 目录的自定义组件示例
  3. 提供前后端联动的完整流程

- **openPage / 页面跳转**：如果用户实现导航类自定义动作：
  1. 说明 LLM 控制的 URL 不可信，不可直接 `window.open(params.url)`
  2. 引导查看 `references/angular.md` 的 `openAllowedPage` 模式（origin 白名单 + 协议校验）
  3. 跨域或 `_blank` 须使用 `noopener,noreferrer`，拒绝未授权目标

- **Legacy 迁移**：如果用户从 v1.3.0 前版本升级、希望零配置快速迁移：
  1. 引导使用 `GenuiLegacyChat`（Vue）或 `GenuiLegacyRenderer`（Vue/Angular）
  2. 说明内置默认物料，无需 `GenuiConfigProvider`
  3. 新项目仍应使用当前版组件 + 官方物料包，见 `references/vue.md` 或 `references/angular.md` 兼容组件章节

- **Element Plus 用户**：如果项目已使用 Element Plus 而非 OpenTiny Vue：
  1. 说明可使用 `@opentiny/genui-sdk-materials-vue-element-plus` 替代官方物料
  2. 引导查看 `references/materials/vue-element-plus.md`
  3. 提醒需额外引入 `element-plus/dist/index.css`

- **精简组件集**：如果用户不需要图表或想减小物料体积：
  1. 说明 OpenTiny Vue 官方包提供 `miniMaterials` / `miniMaterialsMeta` 精简集
  2. 引导查看 `references/materials/vue-opentiny-vue.md`
  3. 强调前后端须一致使用 mini 版本

一旦了解他们的需求，**阅读相应的参考文件**并提供指导。

## 核心概念

在深入具体技术栈之前，理解这些关键概念：

### 物料（Materials）

GenUI SDK 使用**物料系统**将核心 SDK 与 UI 组件解耦。使用当前版 **GenuiChat** / **GenuiRenderer**（v1.3.0+）时，须通过 `GenuiConfigProvider` 注入物料。**Legacy 兼容组件**（`GenuiLegacyChat` / `GenuiLegacyRenderer`）内置默认物料，无需 ConfigProvider，见各参考文件「兼容组件」章节。

官方物料（默认推荐）：
- Vue：`@opentiny/genui-sdk-materials-vue-opentiny-vue`
- Angular：`@opentiny/genui-sdk-materials-angular-opentiny-ng`

可选物料与变体（详见 `references/materials/`）：
- Vue Element Plus 替代方案：`@opentiny/genui-sdk-materials-vue-element-plus`
- OpenTiny Vue 精简集：`miniMaterials` / `miniMaterialsMeta`
- 旧项目迁移：`GenuiLegacyChat` / `GenuiLegacyRenderer`（内置物料）

当用户询问替换 UI 库、精简组件集或迁移方案时，阅读 `references/materials/index.md` 及对应专页。

### 组件

**GenuiChat**（仅 Vue）：一个集成的聊天组件，包含会话管理、流式传输和生成状态。是最简单的入门方式。

**GenuiRenderer**：核心渲染器组件，将 JSON schema 转换为 UI。Vue 和 Angular 都可用。当你需要更多控制 UI 或想要构建自定义聊天界面时使用。

**GenuiConfigProvider**：配置提供者，注入物料和主题。当前版 GenuiChat / GenuiRenderer 集成需要；Legacy 兼容路径可省略。

### 流式协议

GenUI SDK 使用服务器发送事件（SSE）和 OpenAI 兼容格式。LLM 在用 ` ```schemaJson ` 标记的代码块中返回 JSON schema，SDK 提取并渲染这些内容。

## 集成模式概览

根据用户需求，引导他们选择合适的模式：

### 模式 1：GenuiChat（仅 Vue，推荐快速开始）
- **适用场景**：快速构建完整的聊天界面
- **特点**：开箱即用，包含会话管理、流式传输、生成状态
- **详细指南**：见 `references/vue.md` 模式 1 概况，操作步骤见 [快速开始](https://docs.opentiny.design/genui-sdk/guide/quick-start)

### 模式 2：GenuiRenderer（Vue 和 Angular，自定义 UI）
- **适用场景**：构建自定义聊天界面或与现有 UI 集成
- **特点**：更灵活的控制，需要自己处理流式数据
- **详细指南**：见 `references/vue.md` 或 `references/angular.md` 模式 2 概况；Vue 见 [使用 Renderer 组件](https://docs.opentiny.design/genui-sdk/guide/start-with-renderer)，Angular 见 [Angular Renderer 指南](https://docs.opentiny.design/genui-sdk/guide/angular/start-with-renderer)

### 模式 3：Server 集成
- **适用场景**：代理 LLM 调用的后端服务
- **特点**：OpenAI 兼容 API，支持流式响应
- **详细指南**：见 `references/server.md`

## 常用配置

### 主题配置

GenuiChat / GenuiRenderer 集成通过 `GenuiConfigProvider` 配置主题：
- `'dark'` - 深色主题
- `'lite'` - 清新主题
- `'light'` - 浅色主题（默认）
- `'auto'` - 跟随浏览器偏好

详细用法见各参考文件。

### 自定义组件和动作

SDK 支持扩展：
- **自定义组件**：让 AI 使用你的业务组件
- **自定义动作**：定义 AI 可以触发的交互（导航类 action 如 openPage 须做 URL 白名单校验）

详细配置和示例见 `examples/` 目录下的相关文档。

## 下一步指导

阅读相应的参考文件后，为用户提供：

1. **安装命令**（针对他们的包管理器：npm/pnpm/yarn）
2. **针对其场景的分步集成指南**
3. **可以复制和 adapt 的完整工作示例**
4. **常见用例的配置技巧**
5. **高级功能的额外文档链接**（指向 `examples/` 目录和 `references/materials/` 物料选型）

记住要：
- 解释**为什么**需要某些配置，而不仅仅是做什么
- 提供何时使用不同模式的上下文
- 强调常见陷阱（如当前版集成忘记注入物料；Legacy 路径则无需 ConfigProvider）
- 主动提供帮助以满足特定定制需求
- 引导用户查看 `examples/` 目录获取更多示例
