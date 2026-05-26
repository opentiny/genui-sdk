# AI 友好型改造规格

## 背景

GenUI SDK 是 OpenTiny 面向生成式 UI 的 pnpm Monorepo，包含 core、server、Vue/Angular 渲染器、Schema 渲染器、演练场与文档站。为提升 **AI Agent 跨会话续作、可验证交付、可发现代码结构** 的能力，引入 Harness 工件与多 Agent 工作流。

## 目标

1. 建立持久化 Harness（`AGENTS.md`、`ai-features.json`、`ai-progress.md`、`scripts/ai-init.sh`）。
2. 各主要包补齐 **`index` 统一出口** 与模块顶部的职责说明。
3. 文档与代码 API 交叉引用一致。
4. 关键路径具备可执行验收（core 测试、playground/docs 冒烟）。

## 范围

- 仓库根 Harness 与 `docs/inner-docs` 说明文档
- `packages/core`、`packages/server`、`packages/frameworks/vue`
- `projects/tiny-schema-renderer`
- `CONTRIBUTING.zh-CN.md` 增加 AI 贡献者指引

## 非目标

- 大规模业务功能重写
- 修改发布版本号或 breaking API（除非单独特性批准）
- 提交 `node_modules` 或无必要地重写 `pnpm-lock.yaml`

## 包级影响面

| 包 | 改造类型 |
|----|----------|
| 根目录 | Harness 工件、脚本 |
| `@opentiny/genui-sdk-core` | 出口、注释、测试门禁 |
| `@opentiny/genui-sdk-server` | 出口、API 验收说明 |
| `@opentiny/genui-sdk-vue` | 出口、示例路径 |
| `@opentiny/tiny-schema-renderer` | 模块边界、README |
| `docs` | 与 AGENTS 交叉链接 |

## 风险与回滚

- 以 **git commit** 为真源；特性失败可回滚到上一 `passes: true` 的 commit。
- 跨包改动使用 **L3 + Sprint Contract**（见 `ai-progress.md`）。

## Harness 档位

当前默认：**L2**（实现 + Evaluator 收尾）。
