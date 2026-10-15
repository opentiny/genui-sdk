# GenUI SDK

<p align="center">
  <a href="https://opentiny.design/genui-sdk" target="_blank" rel="noopener noreferrer">
    <img alt="OpenTiny Logo" src="logo.svg" height="100" style="max-width:100%;">
  </a>
</p>

> 语言: [English](README.md) | 简体中文

GenUI SDK 是 OpenTiny 面向生成式 UI（Generative UI）场景的全栈开发套件，帮助你快速搭建 AI 应用。

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/opentiny/genui-sdk)

## 简介

**GenUI SDK** 是 OpenTiny 团队基于生成式 UI 理念打造的开源解决方案，提供完整的前后端一体化集成能力。它遵循 OpenAI 接口规范，可无缝对接主流大模型服务；内置 Vue、Angular、React 多框架渲染器，支持自定义的组件库、交互行为与主题样式。无论是从零搭建一个 AI 对话应用，还是在现有业务系统中嵌入生成式界面能力，GenUI SDK 都能让开发者开箱即用、灵活扩展。

## 立即体验

你可以前往[演练场](https://opentiny.github.io/genui-sdk/playground/)立即体验生成式 UI 能力。演练场正是基于 GenUI SDK 开发的应用。

## 快速开始

如果你希望在自己的项目中集成 GenUI SDK，可以参考官方[快速开始](https://docs.opentiny.design/genui-sdk/guide/quick-start.html)文档，以及 [Server 包使用文档](https://docs.opentiny.design/genui-sdk/guide/server-usage.html)。

## 包总览

| 分层      | 包名                                                     | 框架       | 文档                                                                                  | 说明                                                                                              |
| --------- | -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 内核      | [`@opentiny/genui-sdk-core`](packages/core/README.md)     | 通用       | [文档](https://docs.opentiny.design/genui-sdk/components/core/api)                     | 协议类型、Prompt 生成、流式Markdown和SchemaJson提取、增量补丁、JSON 修复，被其余大多数包依赖。                   |
| 前端      | [`@opentiny/genui-sdk-vue`](packages/frameworks/vue/README.md) | Vue | [文档](https://docs.opentiny.design/genui-sdk/guide/quick-start)                       | 提供 `GenuiChat`、`GenuiRenderer`、`GenuiConfigProvider` 与 `generateCode`。                      |
| 前端      | [`@opentiny/genui-sdk-angular`](packages/frameworks/angular/README.md) | Angular | [文档](https://docs.opentiny.design/genui-sdk/guide/angular/install)             | 提供 `GenuiRenderer` 与 `GenuiConfigProvider`。                                         |
| 前端      | [`@opentiny/genui-sdk-react`](packages/frameworks/react/README.md) | React | [文档](https://docs.opentiny.design/genui-sdk/guide/react/install)                 | 提供 `GenuiRenderer` 与 `GenuiConfigProvider`。                                             |
| 物料      | [`@opentiny/genui-sdk-materials-vue-opentiny-vue`](packages/materials/vue-opentiny-vue/README.md) | Vue | [文档](https://docs.opentiny.design/genui-sdk/components/materials/vue-opentiny-vue) | 基于 [OpenTiny Vue](https://opentiny.design/tiny-vue/) 的组件映射与 Prompt 元数据。 |
| 物料      | [`@opentiny/genui-sdk-materials-vue-element-plus`](packages/materials/vue-element-plus/README.md) | Vue | [文档](https://docs.opentiny.design/genui-sdk/components/materials/vue-element-plus) | 基于 [Element Plus](https://element-plus.org/) 的组件映射与 Prompt 元数据。         |
| 物料      | [`@opentiny/genui-sdk-materials-angular-opentiny-ng`](packages/materials/angular-opentiny-ng/README.md) | Angular | [文档](https://docs.opentiny.design/genui-sdk/components/materials/angular-opentiny-ng) | 基于 [OpenTiny NG](https://opentiny.design/tiny-ng/) 的组件映射与 Prompt 元数据。 |
| 物料      | [`@opentiny/genui-sdk-materials-react-antd`](packages/materials/react-antd/README.md) | React | [文档](https://docs.opentiny.design/genui-sdk/components/materials/react-antd) | 基于 [Ant Design](https://ant.design/) 的组件映射与 Prompt 元数据。             |
| 服务端    | [`@opentiny/genui-sdk-server`](packages/server/README.md) | Node.js    | [文档](https://docs.opentiny.design/genui-sdk/guide/server-usage)                      | OpenAI 兼容的 Chat Completions 服务，注入物料元数据并流式输出 SchemaJson。                            |
| AI 工具   | [`@opentiny/genui-sdk-skill-generator`](packages/skill-generator/README.md) | Node.js | [文档](https://docs.opentiny.design/genui-sdk/components/skill-generator/api) | 根据 `genPrompt` 输出生成 Agent Skill（Cursor / Claude Code 等）。                |
| AI 工具   | [`@opentiny/genui-sdk-integration-skill`](packages/integrate/skill/genui-integration/README.md) | — | [文档](https://docs.opentiny.design/genui-sdk/components/integration-skill/api) | 指导 AI 助手集成 GenUI SDK（Vue / Angular / React / Server）的 Skill。             |

各包之间的配合有两条关键规则：

1. 渲染器不内置组件库，需通过 `GenuiConfigProvider` 注入一个**物料包**。
2. **服务端物料必须与前端一致**，否则大模型生成的组件名前端无法渲染。详见[服务端](#服务端-server)。

## 使用方式

### 内核 Core

提供框架无关的底层能力，供各前端包与服务端使用。只有在你自建渲染器、Prompt 流程或服务端集成时才需要直接安装。

```bash
npm install @opentiny/genui-sdk-core
```

```ts
import { genPrompt, repairJson } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

// 根据框架 + 物料元数据生成 system prompt
const systemPrompt = genPrompt('Vue', materialsMeta, customConfig);

// 修复流式返回中不完整的 JSON
const { state, value } = repairJson(partialJson);
```

此外还导出 `PatternExtractor` / `StreamPatternExtractor`（拆分流式文本与 `SchemaJson` 片段）、`DeltaPatcher`（增量 JSON 补丁）以及协议类型（`CardSchema`、`IChatMessage`、`IMaterials` 等）。

详见 [Core API 文档](https://docs.opentiny.design/genui-sdk/components/core/api)。

### Vue

```bash
pnpm add @opentiny/genui-sdk-vue @opentiny/genui-sdk-materials-vue-opentiny-vue
```

可直接使用开箱即用的 `GenuiChat`，也可使用 `GenuiRenderer` 自建对话外壳。

```vue
<script setup>
import { GenuiChat, GenuiConfigProvider } from '@opentiny/genui-sdk-vue';
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
</script>

<template>
  <GenuiConfigProvider theme="light" :materials="materials">
    <GenuiChat url="/api/chat" model="deepseek-chat" />
  </GenuiConfigProvider>
</template>
```

需要控制包体积时，可按子路径引入对应功能：

| 子路径                                    | 导出内容                                     |
| ----------------------------------------- | -------------------------------------------- |
| `@opentiny/genui-sdk-vue`                 | 下列全部                                     |
| `@opentiny/genui-sdk-vue/chat`            | `GenuiChat`                                  |
| `@opentiny/genui-sdk-vue/renderer`        | `GenuiRenderer`                              |
| `@opentiny/genui-sdk-vue/config-provider` | `GenuiConfigProvider`                        |
| `@opentiny/genui-sdk-vue/code-generator`  | `generateCode`（SchemaJson 转 Vue SFC）     |
| `@opentiny/genui-sdk-vue/legacy-chat`     | `GenuiLegacyChat`（内置 OpenTiny Vue 物料）  |

文档：[快速开始](https://docs.opentiny.design/genui-sdk/guide/quick-start.html) · [GenuiChat](https://docs.opentiny.design/genui-sdk/components/chat) · [GenuiRenderer](https://docs.opentiny.design/genui-sdk/components/renderer) · [generateCode](https://docs.opentiny.design/genui-sdk/components/code-generator)。

### Angular

```bash
pnpm add @opentiny/genui-sdk-angular @opentiny/genui-sdk-materials-angular-opentiny-ng @opentiny/ng-themes
```

需要引入主题样式，并确保工程已配置 `zone.js` 与动画（`polyfills: ["zone.js"]`、`provideAnimations()`）：

```ts
import { Component } from '@angular/core';
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-angular';
import { materials } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/materials';

@Component({
  standalone: true,
  imports: [GenuiConfigProvider, GenuiRenderer],
  template: `
    <genui-config-provider [materials]="materials">
      <genui-renderer [content]="schemaJson" [state]="state" [generating]="isGenerating" />
    </genui-config-provider>
  `,
})
export class AppComponent {
  materials = materials;
  schemaJson = '{}';
  state: Record<string, any> = {};
  isGenerating = false;
}
```

如需兼容内置物料的旧用法，可使用 `GenuiLegacyRenderer`。

文档：[安装与配置](https://docs.opentiny.design/genui-sdk/guide/angular/install) · [GenuiRenderer](https://docs.opentiny.design/genui-sdk/components/angular/renderer)。

### React

```bash
pnpm add @opentiny/genui-sdk-react @opentiny/genui-sdk-materials-react-antd antd
```

```tsx
import { GenuiConfigProvider, GenuiRenderer } from '@opentiny/genui-sdk-react';
import { materials } from '@opentiny/genui-sdk-materials-react-antd/materials';
import 'antd/dist/reset.css';

export function App({ schemaJson }: { schemaJson: unknown }) {
  return (
    <GenuiConfigProvider materials={materials}>
      <GenuiRenderer content={schemaJson} isJsonComplete />
    </GenuiConfigProvider>
  );
}
```

子路径导出：`@opentiny/genui-sdk-react/renderer`、`@opentiny/genui-sdk-react/config-provider`。

文档：[安装与配置](https://docs.opentiny.design/genui-sdk/guide/react/install) · [GenuiRenderer](https://docs.opentiny.design/genui-sdk/components/react/renderer)。

### 物料包 Materials

每个物料包提供两部分内容：

- `materials`：运行时组件映射，注入 `GenuiConfigProvider`，渲染器据此按 `componentName` 解析组件。
- `materialsMeta`：Prompt 元数据（组件描述、白名单、示例、规则），供服务端 `genPrompt()` 使用。

| 包名                                                | 组件库        | 默认容器组件 | 导出                                                                                 |
| --------------------------------------------------- | ------------- | ------------ | ------------------------------------------------------------------------------------ |
| [`@opentiny/genui-sdk-materials-vue-opentiny-vue`](packages/materials/vue-opentiny-vue/README.md) | OpenTiny Vue | `TinyCard` | `materials` / `miniMaterials` / `plusMaterials`，`materialsMeta` / `miniMaterialsMeta` / `plusMaterialsMeta` |
| [`@opentiny/genui-sdk-materials-vue-element-plus`](packages/materials/vue-element-plus/README.md) | Element Plus | `ElCard` | `materials`、`materialsMeta` |
| [`@opentiny/genui-sdk-materials-angular-opentiny-ng`](packages/materials/angular-opentiny-ng/README.md) | OpenTiny NG | `TiCard` | `materials`、`materialsMeta` |
| [`@opentiny/genui-sdk-materials-react-antd`](packages/materials/react-antd/README.md) | Ant Design | `AntCard` | `materials`、`materialsMeta` |

Vue OpenTiny 物料分为三档：`mini`（表单/信息块）、标准 `materials`（数据展示、图表）、`plus`（完整业务页面：树、弹窗、时间线等）。前端组件映射与服务端元数据有对应的档位。

```ts
// 前端：注入组件映射
import { materials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';
// import { plusMaterials } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/materials';

// 服务端：使用同档位元数据生成 Prompt
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';
const systemPrompt = genPrompt('Vue', materialsMeta, customConfig);
```

将上述路径替换为与你的框架匹配的物料包，并向 `genPrompt` 传入对应框架名（`'Vue'`、`'Angular'`、`'React'`）。

文档：[Vue OpenTiny Vue](https://docs.opentiny.design/genui-sdk/components/materials/vue-opentiny-vue) · [Vue Element Plus](https://docs.opentiny.design/genui-sdk/components/materials/vue-element-plus) · [Angular OpenTiny NG](https://docs.opentiny.design/genui-sdk/components/materials/angular-opentiny-ng) · [React Ant Design](https://docs.opentiny.design/genui-sdk/components/materials/react-antd)。

### 服务端 Server

提供 OpenAI 兼容的 Chat Completions 服务与流式 SchemaJson 支持。CLI 只能使用内置默认物料（Vue → OpenTiny Vue，Angular → OpenTiny NG）；当前端使用其他物料包时，须显式传入 `materialsMeta`。

```bash
# .env
# BASE_URL=https://api.openai.com/v1
# API_KEY=your-api-key
# PORT=3100

npx genui-sdk-server            # 默认端口 3100
npx genui-sdk-server -p 3000    # 指定端口
npx genui-sdk-server -e .env.production
```

编程方式：

```ts
import { startServer, equipChatCompletions } from '@opentiny/genui-sdk-server';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

startServer({ port: 3100, baseURL: 'https://api.openai.com/v1', apiKey: '***', materialsMeta });

// 或挂载到已有 Express 应用：
const app = express();
equipChatCompletions(app, { route: '/api/chat', baseURL: '...', apiKey: '***', materialsMeta });
```

文档：[Server 包使用文档](https://docs.opentiny.design/genui-sdk/guide/server-usage.html) · [Server API](https://docs.opentiny.design/genui-sdk/components/server/api)。

### AI 工具

**集成 Skill**：安装后将包内 `SKILL.md` 指向你的 AI 助手（支持 Skills 规范的工具均可）：

```bash
npm install @opentiny/genui-sdk-integration-skill
```

它可回答「帮我集成 GenUI SDK 到 Vue 项目」「如何在 Angular 中使用 `GenuiRenderer`」「怎么设置 genui-sdk-server」等问题。

**Skill 生成器**：根据 `genPrompt(framework, materialsMeta, …, { isSkill: true })` 的输出生成项目专属的 Agent Skill：

```bash
npx @opentiny/genui-sdk-skill-generator --out ./skills/my-skill
npx @opentiny/genui-sdk-skill-generator --config path/to/config.json
```

```ts
import { generateSkillFiles, buildGenuiSchemaSkillBody } from '@opentiny/genui-sdk-skill-generator';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

generateSkillFiles('vue', materialsMeta, {
  skillDirs: ['/path/to/skills/genui-schema-json'],
  formatSkillBody: buildGenuiSchemaSkillBody,
});
```

文档：[Skill Generator API](https://docs.opentiny.design/genui-sdk/components/skill-generator/api) · [集成 Skill](https://docs.opentiny.design/genui-sdk/components/integration-skill/api)。

## 核心能力

GenUI SDK 在设计上兼顾了”开箱即用“与”深度定制“，具备丰富的特性和良好的生态兼容性。

| 特性             | 说明                                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 现有 AI 生态兼容 | 遵循 OpenAI 接口规范，可无缝对接主流 LLM 服务，并支持 MCP 能力扩展，方便集成各类外部工具与企业内部系统。                                      |
| 定制主题         | 支持主题切换、暗黑模式以及基于 Token 的主题定制，适配不同品牌与产品的界面规范。                                                              |
| 自定义组件       | 可扩展生成式 UI 组件库，将业务组件纳入统一的生成式交互体系中。                                                 |
| 自定义交互       | 支持灵活配置多轮对话流程、自定义指令与操作（如打开页面、拉取数据、生成表单等），满足复杂业务场景下的人机协同需求。                               |
| 多技术栈支持     | 内置 Vue、Angular 与 React 渲染器，既可在新项目中直接使用，也可为已有前端项目提供渐进式接入方案。                                              |
| 更多能力         | 提供示例工程与最佳实践模板，结合服务端能力实现消息编排、工具调用、权限控制等高级能力，帮助你快速构建可落地的 AI 应用。                           |

若想进一步了解 GenUI SDK 的用法，可以前往 GenUI SDK [特性示例文档](https://docs.opentiny.design/genui-sdk/examples/renderer/custom-actions.html)查看更完整的功能说明与实践指南。

## 贡献指南

如果你对 GenUI SDK 感兴趣，你可以参与贡献。参与贡献前，请先阅读[贡献指南](CONTRIBUTING.zh-CN.md)

你也可以通过以下方式联系我们，进一步交流：
- 添加官方小助手微信：`opentiny-official`，加入技术交流群
- 加入邮件列表：<opentiny@googlegroups.com>

## 授权协议

[MIT](https://opensource.org/license/MIT)
