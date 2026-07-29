---
name: genui-integration
description: 帮助用户集成 GenUI SDK 到项目中。当用户提到 GenUI、genui-sdk、生成式 UI 集成、想要在 Vue 或 Angular 项目中添加 AI 驱动的 UI 渲染、需要设置 genui-sdk-server，或询问 OpenTiny 的生成式 UI 组件时使用。也当用户想要添加带 AI 驱动 UI 生成的聊天界面、集成流式 UI 渲染器、或配置 genui 物料和主题时触发。
---

# GenUI SDK 集成指南

本 skill 帮助用户将 GenUI SDK 集成到项目中。GenUI SDK 是一个用于构建由大语言模型（LLM）驱动的生成式 UI 界面的工具包，使 AI 能够动态生成交互式 UI 组件。

## 理解用户需求

在提供集成指导之前，确定：

1. **使用哪个技术栈？** 询问用户使用什么技术：
   - **Vue**（Vue 3 组合式 API）
   - **Angular**（Angular 独立组件）
   - **Server**（Node.js 后端服务）
   - **多个/全部**（他们需要全面指导）

2. **项目状态？** 确定他们是：
   - 从零开始（新项目）
   - 添加到现有项目

3. **使用场景？** 了解他们想要构建什么：
   - 带 AI 的完整聊天界面（使用 `GenuiChat`）
   - 带流式渲染器的自定义 UI（使用 `GenuiRenderer`）
   - 代理 LLM 调用的后端服务（使用 `genui-sdk-server`）

一旦了解他们的需求，**阅读相应的参考文件**：
- `references/vue.md` - Vue 集成指南（包含完整代码示例）
- `references/angular.md` - Angular 集成指南（包含完整代码示例）
- `references/server.md` - Server 集成指南（包含完整代码示例）

## 核心概念

在深入具体技术栈之前，理解这些关键概念：

### 物料（Materials）

GenUI SDK 使用**物料系统**将核心 SDK 与 UI 组件解耦。物料定义 JSON schema 如何渲染为实际的 UI 组件。你必须通过 `GenuiConfigProvider` 注入物料。

官方物料：
- Vue：`@opentiny/genui-sdk-materials-vue-opentiny-vue`
- Angular：`@opentiny/genui-sdk-materials-angular-opentiny-ng`

### 组件

**GenuiChat**（仅 Vue）：一个集成的聊天组件，包含会话管理、流式传输和生成状态。是最简单的入门方式。

**GenuiRenderer**：核心渲染器组件，将 JSON schema 转换为 UI。Vue 和 Angular 都可用。当你需要更多控制 UI 或想要构建自定义聊天界面时使用。

**GenuiConfigProvider**：配置提供者，注入物料和主题。所有集成都需要。

### 流式协议

GenUI SDK 使用服务器发送事件（SSE）和 OpenAI 兼容格式。LLM 在用 ` ```schemaJson ` 标记的代码块中返回 JSON schema，SDK 提取并渲染这些内容。

## 集成模式概览

根据用户需求，引导他们选择合适的模式：

### 模式 1：GenuiChat（仅 Vue，推荐快速开始）
- **适用场景**：快速构建完整的聊天界面
- **特点**：开箱即用，包含会话管理、流式传输、生成状态
- **详细指南**：见 `references/vue.md` 的"集成模式 1"部分

### 模式 2：GenuiRenderer（Vue 和 Angular，自定义 UI）
- **适用场景**：构建自定义聊天界面或与现有 UI 集成
- **特点**：更灵活的控制，需要自己处理流式数据
- **详细指南**：见 `references/vue.md` 或 `references/angular.md` 的"集成模式 2"部分

### 模式 3：Server 集成
- **适用场景**：代理 LLM 调用的后端服务
- **特点**：OpenAI 兼容 API，支持流式响应
- **详细指南**：见 `references/server.md`

## 常用配置

### 主题配置

所有集成都支持通过 `GenuiConfigProvider` 配置主题：
- `'dark'` - 深色主题
- `'lite'` - 清新主题
- `'light'` - 浅色主题（默认）
- `'auto'` - 跟随浏览器偏好

详细用法见各参考文件。

### 自定义组件和动作

SDK 支持扩展：
- **自定义组件**：让 AI 使用你的业务组件
- **自定义动作**：定义 AI 可以触发的交互

详细配置和示例见 `examples/` 目录下的相关文档。

## 下一步指导

阅读相应的参考文件后，为用户提供：

1. **安装命令**（针对他们的包管理器：npm/pnpm/yarn）
2. **针对其场景的分步集成指南**
3. **可以复制和 adapt 的完整工作示例**
4. **常见用例的配置技巧**
5. **高级功能的额外文档链接**（指向 `examples/` 目录）

记住要：
- 解释**为什么**需要某些配置，而不仅仅是做什么
- 提供何时使用不同模式的上下文
- 强调常见陷阱（如忘记注入物料）
- 主动提供帮助以满足特定定制需求
- 引导用户查看 `examples/` 目录获取更多示例
