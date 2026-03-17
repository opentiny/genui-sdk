# GenUI SDK

> 语言: [English](README.md) | 简体中文

GenUI SDK 是 OpenTiny 面向生成式 UI（Generative UI）场景的全栈开发套件，帮助你快速搭建 AI 应用。

## 简介

**GenUI SDK** 是 OpenTiny 团队基于生成式 UI 理念打造的开源解决方案，提供完整的前后端一体化集成能力。它遵循 OpenAI 接口规范，可无缝对接主流大模型服务；内置 Vue 与 Angular 双框架渲染器，支持自定义的组件库、交互行为与主题样式。无论是从零搭建一个 AI 对话应用，还是在现有业务系统中嵌入生成式界面能力，GenUI SDK 都能让开发者开箱即用、灵活扩展。

## 立即体验

你可以前往[演练场](https://playground.opentiny.design/genui-sdk)立即体验生成式 UI 能力。演练场正是基于 GenUI SDK 开发的应用。

## 快速开始

如果你希望在自己的项目中集使用 GenUI SDK，可以参考官方[快速开始](https://docs.opentiny.design/genui-sdk/guide/quick-start.html)文档，以及[server包使用文档](https://docs.opentiny.design/genui-sdk/guide/server-usage.html)

## 核心能力

GenUI SDK 在设计上兼顾了”开箱即用“与”深度定制“，具备丰富的特性和良好的生态兼容性。

| 特性             | 说明                                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 现有 AI 生态兼容 | 遵循 OpenAI 接口规范，可无缝对接主流 LLM 服务，并支持 MCP 能力扩展，方便集成各类外部工具与企业内部系统。                                      |
| 定制主题         | 支持主题切换、暗黑模式以及基于 Token 的主题定制，适配不同品牌与产品的界面规范。                                                              |
| 自定义组件       | 提供 Schema 驱动的组件描述能力，可扩展生成式 UI 组件库，将业务组件纳入统一的生成式交互体系中。                                                 |
| 自定义交互       | 支持灵活配置多轮对话流程、自定义指令与操作（如打开页面、拉取数据、生成表单等），满足复杂业务场景下的人机协同需求。                               |
| 多技术栈支持     | 内置 Vue 与 Angular 渲染器，既可在新项目中直接使用，也可为已有前端项目提供渐进式接入方案。                                                     |
| 更多能力         | 提供示例工程与最佳实践模板，结合服务端能力实现消息编排、工具调用、权限控制等高级能力，帮助你快速构建可落地的 AI 应用。                           |

若想进一步了解 GenUI SDK 的用法，可以前往 GenUI SDK [特性示例文档](https://docs.opentiny.design/genui-sdk/examples/renderer/custom-actions.html)查看更完整的功能说明与实践指南。

## 组件包

| 名称                | 描述                           |
| ------------------- | ------------------------------ |
| `@opentiny/genui-sdk-server`     | 集成生成式 UI 能力的后台服务，配置简单，启动快速。支持自定义组件、自定义操作等能力 |
| `@opentiny/genui-sdk-vue`        | 基于 Vue 的前端组件与渲染器，可用于快速构建生成式 UI Web 应用。同时拥有强大的定制能力，可用于构建复杂应用。      |
| `@opentiny/genui-sdk-angular`    | 基于 Angular 的渲染器，支持在Angular应用中集成生成式 UI 能力。 |

## 贡献指南

如果你对 GenUI SDK 感兴趣，你可以参与贡献。参与贡献前，请先阅读[贡献指南](CONTRIBUTING.zh-CN.md) 

你也可以通过以下方式联系我们，进一步交流：
- 添加官方小助手微信：`opentiny-official`，加入技术交流群
- 加入邮件列表：<opentiny@googlegroups.com>

## 授权协议

[MIT](https://opensource.org/license/MIT)