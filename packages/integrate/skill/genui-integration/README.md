# GenUI SDK Integration Skill

帮助用户集成 GenUI SDK 到项目中的 Claude skill。

## 概述

本 skill 提供完整的 GenUI SDK 集成指导，支持：

- **Vue 3** - 使用 `GenuiChat` 或 `GenuiRenderer`
- **Angular** - 使用 `GenuiRenderer`
- **Server** - Node.js 后端服务集成

## 快速开始

在 AI 助手中触发本 skill：

```
帮我集成 GenUI SDK 到 Vue 项目
如何在 Angular 中使用 GenuiRenderer？
怎么设置 genui-sdk-server？
```

## 目录结构

```
genui-integration/
├── SKILL.md              # 主 skill 文件
├── references/           # 详细参考文档
│   ├── vue.md
│   ├── angular.md
│   └── server.md
├── examples/             # 示例文件（构建时从 docs 复制）
│   ├── renderer/
│   ├── chat/
│   └── angular/
└── scripts/
    └── copy-from-docs.mjs
```

## 文档来源

`examples/` 在构建时从 monorepo 内 [`docs/src/examples`](../../../../docs/src/examples) 复制，与在线文档示例保持一致。

在线文档：https://docs.opentiny.design/genui-sdk/

## 构建

```bash
pnpm --filter @opentiny/genui-sdk-integration-skill build
```

发布 npm 包时会通过 `prepack` 自动执行上述构建。

## 相关资源

- [GenUI SDK 在线文档](https://docs.opentiny.design/genui-sdk/)
- [GenUI SDK GitHub](https://github.com/opentiny/genui-sdk)

## 许可证

MIT License
