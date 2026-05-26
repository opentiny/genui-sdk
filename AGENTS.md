# GenUI SDK — Agent 入口

> 人类贡献者请参阅 [CONTRIBUTING.zh-CN.md](CONTRIBUTING.zh-CN.md)。  
> Harness 方案说明：[docs/inner-docs/AI_HARNESS.md](docs/inner-docs/AI_HARNESS.md)

## 仓库地图

| 路径 | 职责 |
|------|------|
| `packages/core` | `@opentiny/genui-sdk-core` — 核心协议与工具 |
| `packages/server` | `@opentiny/genui-sdk-server` — 生成式 UI 后台服务 |
| `packages/frameworks/vue` | `@opentiny/genui-sdk-vue` — Vue 渲染器与组件 |
| `packages/frameworks/angular` | `@opentiny/genui-sdk-angular` — Angular 渲染器 |
| `packages/chat-completions` | `@opentiny/genui-sdk-chat-completions` |
| `packages/materials/*` | 物料包（Vue / Angular OpenTiny） |
| `packages/benchmarks` | `@opentiny/genui-sdk-benchmarks` |
| `projects/tiny-schema-renderer` | `@opentiny/tiny-schema-renderer` — Schema 渲染器（Vue） |
| `projects/tiny-schema-renderer-ng` | `@opentiny/tiny-schema-renderer-ng` |
| `sites/playground` | `genui-sdk-playground` — 演练场（server + web） |
| `sites/homepage/web` | `genui-sdk-homepage-web` — 官网 |
| `docs` | `genui-sdk-docs` — VitePress 文档站 |
| `scripts/` | 构建与发布脚本（含 `ai-init.sh`） |

工作区定义见 [pnpm-workspace.yaml](pnpm-workspace.yaml)。

## 常用命令（仓库根目录）

| 场景 | 命令 |
|------|------|
| 安装依赖 | `pnpm i` |
| Harness 冒烟 | `bash scripts/ai-init.sh` |
| Agentic 完成度 | `bash scripts/ai-verify.sh` |
| 演练场 | `pnpm dev` |
| 文档站 | `pnpm dev:docs` |
| 官网 | `pnpm dev:homepage` |
| Server 开发 | `pnpm dev:server` |
| 渲染器构建 | `pnpm build:projects` |
| SDK 库构建 | `pnpm build:lib` |
| Server 构建 | `pnpm build:server` |
| 文档构建 | `pnpm build:docs` |
| 全量（playground） | `pnpm build` |
| Core 单测 | `pnpm --filter @opentiny/genui-sdk-core test -- --run` |

包管理器：**pnpm@10.12.1**（见根 `package.json` 的 `packageManager`）。

## Harness 工件

| 文件 | 用途 |
|------|------|
| [ai-spec.md](ai-spec.md) | 改造目标与范围 |
| [ai-features.json](ai-features.json) | 可验收特性清单（真源） |
| [ai-progress.md](ai-progress.md) | 跨会话进度日志 |
| [ai-review.md](ai-review.md) | Evaluator 最近一次评审 |
| [docs/inner-docs/AI_HARNESS.md](docs/inner-docs/AI_HARNESS.md) | Agentic 方案说明 |
| [docs/inner-docs/ai-harness-prompts.md](docs/inner-docs/ai-harness-prompts.md) | 各 Agent Prompt 全文 |

## 编码铁律

1. **单会话单特性**：从 `ai-features.json` 只取一条 `passes: false` 的实现项。
2. **最小 diff**：不重构无关代码；JS/TS 包以 **`index` 为统一出口**。
3. **验收门禁**：未跑通 `acceptance` / `commands` 不得设 `passes: true`；禁止删改 `description`、`acceptance`。
4. **先修回归**：`scripts/ai-init.sh` 失败时只修环境/回归，不开新功能。
5. **可合并状态**：会话结束前无已知破坏性错误、无半拉子功能。
6. **提交规范**：[Conventional Commits](https://www.conventionalcommits.org/zh-hans/v1.0.0/)，`scope` 用包名。

## 会话协议

### 开场（顺序固定）

```
pwd → 读本文件 → ai-progress.md → ai-features.json → git log --oneline -20
→ bash scripts/ai-init.sh → 选特性 ID → 声明本会话目标
```

### 收尾

1. `git commit`（若适用）
2. L2/L3：Evaluator PASS 后再更新 `passes` / `evidence` / `commit`
3. 在 `ai-progress.md` 追加一节：完成项、命令结果、下一特性 ID、阻塞项

## Harness 档位

| 档位 | 适用 | Evaluator |
|------|------|-----------|
| L1 | 单包、文档、小修 | 可选（自测全过即可） |
| L2 | 单包功能、有测试 | 收尾必审 |
| L3 | 跨包 / P0 | Sprint Contract + 循环 G↔E |

## Known pitfalls

- `pnpm build:lib` 依赖 materials，耗时长；冒烟优先用 `ai-init.sh` 与目标包 filter。
- `docs` 的 `predev` 会构建 Angular element，首次较慢。
- `pnpm-workspace.yaml` 排除了部分 `angular` / `tiny-schema-renderer-ng` 路径，改前确认包是否在 workspace 内。

## 参考

- [awesome-harness-engineering](https://github.com/ai-boost/awesome-harness-engineering)
- [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Harness design for long-running apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
