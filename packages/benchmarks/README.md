# @opentiny/genui-sdk-benchmarks

验证 GenUI SDK 的结构化 UI 生成能力：协议合规、可靠性、延迟、Token，以及可选的生成质量（LLM Judge）。

| 协议 | 输出 | 校验 |
| --- | --- | --- |
| `genui`（默认） | `schemaJson` | `genRootSchema()` |
| `a2ui` | `<a2ui-json>` | A2UI v0.9.1 Schema + AJV |

**非目标**：不做渲染美观评分；不做同一次运行内的双协议并排；不合成跨协议 / 跨维度总分；不是通用 LLM 排行榜。

```text
选模型与场景 → 调模型落盘样本 → 协议校验（可选 Judge）→ 聚合指标 → JSON / HTML / Excel
```

## 目录

- [快速开始](#快速开始)
- [读报告](#读报告)
- [指标口径](#指标口径)
- [常用命令](#常用命令)
- [配置参考](#配置参考)
- [协议差异](#协议差异)
- [代码入口](#代码入口)

## 快速开始

### 1. 配置凭证

在仓库根目录：

```bash
cp packages/benchmarks/.env.example packages/benchmarks/.env
```

按模型清单里的 `apiKeyEnvName` 填写 Key（默认清单常用 `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`）。  
清单默认：`sites/playground/server/maas-models.json`；可改 `BENCH_MAAS_MODELS_PATH`。

### 2. 跑起来

本地调试（打开配置页，默认 `127.0.0.1:3847`）：

```bash
pnpm benchmarks
```

配置页有「快速检查 / 完整评测 / 自定义」预设，只填表单，仍可再改；「快速检查」仅冒烟，不能当性能结论。

无 UI、按配置直接跑：

```bash
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

跑完先打开 `packages/benchmarks/reports/<北京时间>/report.html`。

任务量粗算：`模型数 × 场景数 × repeat × prompt 变体数`（`full + plain` 为 2）。全清单 × 全场景 × 高 repeat 很贵，日常用「快速检查」或 `benchmarks:smoke`。

## 读报告

默认产物目录：`packages/benchmarks/reports/<北京时间>/`

```text
reports/2026-08-26_14-30-00/
├── <model>_<scenario>_<run>.json   # 原始样本
├── report.json                     # 机器可读全量
├── report.html                     # 优先看这个
└── report_<runDir>.xlsx            # 明细 / 按场景对比
```

建议顺序：`report.html`（健康度、协议失败、p95、Token、模型对比）→ Excel 筛选 → 异常时回看 `report.json` 与样本。

## 指标口径

### 可靠性与协议

三个成功率**不能混用**（仅统计计入协议门禁的样本；`plain` 除外）：

| 指标 | 计算 | 用途 |
| --- | --- | --- |
| `requestSuccessRate` | 请求成功 / 全部协议样本 | 服务与网络可靠性 |
| `protocolPassRateOnSuccess` | 协议通过 / 请求成功 | 成功响应里的结构化能力 |
| `endToEndSuccessRate` | 协议通过 / 全部协议样本 | **发布门禁**（失败请求也算失败） |

`failureTag`：

| Tag | 含义 |
| --- | --- |
| `ok` | 请求成功且协议通过 |
| `timeout` | 超时或中止 |
| `request_error` | 其他请求 / 流错误 |
| `no_protocol_block` | 无 `schemaJson` 或 `<a2ui-json>` |
| `invalid_json` | 有块但 JSON 不可解析 |
| `schema_error` | JSON 合法但未过协议 Schema |

开启门禁时，`endToEndSuccessRate < 1` → 非 0 退出码。可用 `BENCH_FAIL_ON_PROTOCOL=true|false` 覆盖套件默认。

### 延迟

| 指标 | 含义 |
| --- | --- |
| `firstChunkMs` | 首个文本或推理 chunk（`ttftMs` 为其兼容字段） |
| `firstTextMs` | 首个用户可见文本 chunk |
| `firstObservableComponentMs` | 首次可观测 UI 根（GenUI：`wrapperComponent`；A2UI：`"id":"root"`） |
| `totalMs` | 请求开始到流结束 |
| `tpotMs` | `(totalMs - firstTextMs) / (completionTokens - 1)`；token≤1 或不计 |

`concurrency=1` 接近单用户体感；并发 > 1 应解读为负载下延迟。比较性能优先看 Nightly / Release 的 median、p95 与波动。

### Token 与 Judge

- 生成：`promptTokens` / `completionTokens` / `totalTokens`
- `benchTotalTokens`：生成 + Judge
- `llmJudgeScore`（1～10）及 `llmJudgeReason` / `llmJudgeError`

Judge 默认关闭。未设 `BENCH_LLM_JUDGE_MODEL` 时复用主模型；正式选型建议单独指定 Judge。`plain` 不跑 Judge、不计入协议通过率。

## 常用命令

### 自动化套件（CI / 定时）

| 命令 | 配置 | 协议门禁 | 用途 |
| --- | --- | --- | --- |
| `benchmarks:smoke` | 6 个代表场景，repeat=1，并发=2 | 开 | 尽快发现明显错误 |
| `benchmarks:nightly` | 全场景，repeat=3，并发=2 | 关 | 每日趋势，少误阻断 |
| `benchmarks:release` | 全场景，repeat=5，并发=1 | 开 | 发版门禁 |

```bash
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:smoke
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:nightly
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:release
```

`smoke` 场景：`simple-form`、`dashboard-card`、`table-and-filter`、`form-validation`、`permission-ui`、`chart-dashboard-combo`。  
`nightly` 是调度策略，不是配置页里另一种能力；单项可用显式 `BENCH_*` 覆盖。

### 指定模型 / 场景

```bash
BENCH_MODEL=DeepSeek-V3.2 \
BENCH_SCENARIOS=simple-form,table-and-filter \
BENCH_REPEAT=3 \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

多模型：`BENCH_MODELS=Model-A,Model-B`（逗号分隔，优先于单模型）。

### A2UI 冒烟

```bash
BENCH_PROTOCOL=a2ui \
BENCH_SCENARIOS=simple-form \
BENCH_REPEAT=1 \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

### 启用 Judge

```bash
BENCH_LLM_JUDGE=true \
BENCH_LLM_JUDGE_MODEL=<judge-model-id> \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:release
```

### 比较两次运行

```bash
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:diff -- \
  --baseline reports/<old>/report.json \
  --current reports/<new>/report.json \
  --out reports/<new>/diff.json
```

比较协议通过率、p95 总耗时、平均 Token，并校验实验指纹（协议 / 框架 / materials、场景与 prompt 变体、并发、system / 样本集 / materials hash）。指纹不一致输出 `fingerprint_mismatch`，不生成 `regressions`。

回归标记：协议通过率下降；p95 总耗时 ↑≥20% 且绝对值 ≥2s；平均 Token ↑≥15%。

### 中断后续跑

```bash
BENCH_TARGET_SAMPLE_RUN_DIR=2026-08-26_14-30-00 \
BENCH_SKIP_EXISTING_SAMPLES=true \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

指定目标目录后默认跳过已有样本；覆盖重跑设 `BENCH_SKIP_EXISTING_SAMPLES=false`。续跑须保持模型、协议、场景、repeat、prompt、materials 一致。报告仅在生成阶段结束后写出。

### 限流与重试

```bash
BENCH_CONCURRENCY=4 \
BENCH_MODEL_RATE_LIMIT='{"DeepSeek-V3.2":{"requests":5,"windowMs":60000}}' \
BENCH_RETRY_MAX_ATTEMPTS=5 \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

重试等待与限流排队不计入单次 `totalMs`，记入 `retryCount` / `retryWaitMs` / `rateLimitQueueWaitMs` / `rateLimited`。

### Full / Plain 对照

| 配置 | 生成 |
| --- | --- |
| 默认 | 仅 `full`（完整 system） |
| `BENCH_COMPARE_EMPTY_SYSTEM=true` | `full` + 空 system 的 `plain` |
| `BENCH_PLAIN_ONLY=true` | 仅 `plain` |

`plain` 看 system 收益，不参与协议通过率与 Judge；补到已有 full run 时配合 `BENCH_TARGET_SAMPLE_RUN_DIR`。

## 配置参考

优先级（只记这一处）：

```text
配置页表单（仅 UI 运行）
> 显式 BENCH_* 环境变量
> BENCH_SUITE 预设
> benchmark.config.ts
```

### CLI 最终跑哪些模型

```text
BENCH_MODELS
> 套件 / config 中非空 models
> BENCH_MODELS_FROM_MAAS=true 时的清单全部模型
> BENCH_MODEL
> 套件 / config 中的 model
```

配置页点「启动测试」后以表单为准：「使用清单全部模型」开则跑清单全部，否则跑页面勾选。自定义模型须先入清单（或走 CLI 且能解析 Provider）。

报告主模型：显式 `model`，否则 `models` 首项。Judge 同理，未设则复用主模型。

### 环境变量

| 变量 | 说明 |
| --- | --- |
| `BENCH_SUITE` | `smoke` / `nightly` / `release` |
| `BENCH_MODEL` / `BENCH_MODELS` | 单模型；或多模型（优先） |
| `BENCH_PROTOCOL` | `genui` \| `a2ui` |
| `BENCH_FRAMEWORK` | `Vue` \| `Angular`；A2UI 下忽略 |
| `BENCH_MATERIALS_VARIANT` | `standard` \| Vue `mini`；A2UI 下忽略 |
| `BENCH_SCENARIO` / `BENCH_SCENARIOS` | 单场景；或多场景（优先） |
| `BENCH_REPEAT` | 每「模型 × 场景」次数 |
| `BENCH_CONCURRENCY` | 生成与 Judge 并发 |
| `BENCH_LLM_JUDGE` / `BENCH_LLM_JUDGE_MODEL` | 是否 Judge；Judge 模型 |
| `BENCH_FAIL_ON_PROTOCOL` | 端到端协议门禁 |
| `BENCH_STREAM_TIMEOUT_MS` | 单次流超时，默认 `600000`；`0` 不限制 |
| `BENCH_RETRY_MAX_ATTEMPTS` | 最大请求次数（含首次） |
| `BENCH_MODEL_RATE_LIMIT` | 按模型滑动窗口限流 JSON |
| `BENCH_TARGET_SAMPLE_RUN_DIR` | 写入已有 run |
| `BENCH_SKIP_EXISTING_SAMPLES` | 是否跳过已有样本 |
| `BENCH_UI` | `false` 时直接 CLI |
| `BENCH_MAAS_MODELS_PATH` | 模型清单路径 |
| `BENCH_MODELS_FROM_MAAS` | 使用清单全部模型 |
| `BENCH_SAMPLES_DIR` / `BENCH_OUTPUT_DIR` | 样本根 / 报告目录 |
| `BENCH_WRITE_EXCEL` / `BENCH_JSON` | Excel；控制台额外打 JSON |
| `BENCH_COMPARE_EMPTY_SYSTEM` / `BENCH_PLAIN_ONLY` | full+plain / 仅 plain |

布尔：`1` / `true` / `yes` 为开；`0` / `false` 等非空为关；未设则用下一级默认。更多注释见 `.env.example`。

### 内置场景

定义在 `src/samples/`：

- `basic`：表单、卡片、表格、设置页等
- `complex`：向导、可编辑表、主从、组合仪表盘等
- `constraints`：校验、权限、移动端
- `edge`：空态、长内容、错误重试
- `contextual`：多轮；GenUI / A2UI 各一份

由 `getLlmBenchmarkSampleCases(protocol)` 合并共享场景与当前协议的 contextual。

## 协议差异

### 与 SDK（GenUI）

| SDK | Benchmark 用途 |
| --- | --- |
| `genPrompt` + `materialsMeta` | 生成阶段 system |
| `PatternExtractor` / `SchemaJsonPattern` | 抽 `schemaJson` |
| `repairJson` | 修复并解析（仅 GenUI） |
| `genRootSchema(whiteList)` | 协议 + 白名单 |
| `wrapperComponent` | 首个可观测 UI |

`StreamPatternExtractor`、`DeltaPatcher`、渲染默认值映射不在本包范围。

### A2UI

同一模型 / 场景 / repeat 下，`BENCH_PROTOCOL=genui` 与 `a2ui` **各跑一次**，再用 `benchmarks:diff` 比通过率与延迟 / Token。

| 项 | 说明 |
| --- | --- |
| Schema | pin **v0.9.1** + Basic Catalog，`vendor/a2ui/`（升级见该目录 README） |
| System | `src/protocol/a2ui/prompt.ts`（官方 DirectJson 拼装）；不依赖 Python `a2ui-agent-sdk` |
| 忽略 | `framework` / `materialsVariant` / GenUI `specificPrompt`；**无** `repairJson`（与 GenUI 不对称） |
| 校验 | 全部 `<a2ui-json>` → parse → AJV（字段名仍用历史 `isSchemaJson*`） |
| Contextual | `contextual-a2ui.ts`；重录：`pnpm exec tsx ./scripts/capture-a2ui-contextual.mts` |

## 代码入口

```text
main.ts                      UI / CLI
src/benchmark.config.ts      默认配置
src/suites.ts                smoke / nightly / release
src/generate-samples.ts      调模型、流式指标、重试、落盘
src/run-report.ts            协议校验、Judge、门禁
src/framework/runner.ts      聚合写报告
src/utils/health.ts          成功率与失败分类
scripts/diff-reports.mjs     两次报告离线比较
src/protocol/                GenUI / A2UI
vendor/a2ui/                 A2UI schema / rules pin
src/samples/                 场景
```
