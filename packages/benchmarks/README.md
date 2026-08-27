# @opentiny/genui-sdk-benchmarks

用于验证 GenUI SDK 的结构化 UI 生成能力，并比较模型在协议合规、可靠性、延迟、Token 和生成质量上的表现。

支持两种协议：

- `genui`（默认）：模型输出 `schemaJson`，使用 `genRootSchema()` 校验。
- `a2ui`：模型输出 `<a2ui-json>`，使用 A2UI v0.9.1 Schema 和 AJV 校验。

```text
选择模型与场景
  → 调用模型并保存原始样本
  → 协议校验与可选 LLM Judge
  → 聚合可靠性、延迟和 Token 指标
  → 生成 JSON / HTML / Excel 报告
```

## 快速开始

### 1. 配置模型凭证

在仓库根目录执行：

```bash
cp packages/benchmarks/.env.example packages/benchmarks/.env
```

然后填写 API Key。变量名由模型清单中的 `apiKeyEnvName` 决定，仓库默认清单常用：

```dotenv
DEEPSEEK_API_KEY=<your-api-key>
DEEPSEEK_BASE_URL=https://api.modelarts-maas.com/v1/
```

模型清单默认读取 `sites/playground/server/maas-models.json`。需要使用其他清单时设置：

```dotenv
BENCH_MAAS_MODELS_PATH=/absolute/path/to/maas-models.json
```

### 2. 选择运行方式

交互式运行适合本地调试。在仓库根目录执行：

```bash
pnpm benchmarks
```

浏览器会打开配置页，可选择模型、协议、场景、重复次数和 Judge。配置页默认监听 `127.0.0.1:3847`，端口占用时自动顺延。

只想按 `benchmark.config.ts` 和 `BENCH_*` 运行时：

```bash
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

## 配置页预设

| 预设 | 场景 | Repeat | 并发 | Judge | 用途 |
| --- | --- | ---: | ---: | --- | --- |
| 快速检查 | 6 个代表场景 | 1 | 2 | 关闭 | 验证模型、Prompt 和协议链路是否正常 |
| 完整评测 | 全部场景 | 5 | 1 | 保持当前选择 | 稳定比较、发版确认和模型选型 |
| 自定义 | 手工选择 | 手工设置 | 手工设置 | 手工设置 | 专项实验和调试 |

预设只负责填写表单，选择后仍可修改任意配置；手工修改后页面会自动标记为“自定义”。快速检查只用于冒烟，不能据此得出稳定的性能结论。

## 自动化套件

CLI 保留三个固定套件，用于 CI 和定时任务：

```bash
# 合并后的快速协议门禁
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:smoke

# 每日全场景趋势评测，默认不阻断
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:nightly

# 发版前完整评测，协议失败时阻断
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:release
```

它们的区别主要是触发时机和门禁策略：

| 自动化任务 | 使用的评测配置 | 协议门禁 | 目的 |
| --- | --- | --- | --- |
| `smoke` | 快速检查 | 开启 | 尽快发现明显错误 |
| `nightly` | 全场景，repeat=3，并发=2 | 关闭 | 记录每日趋势，减少偶发波动误阻断 |
| `release` | 完整评测 | 开启 | 决定是否允许发布 |

显式环境变量可以覆盖套件中的单项配置，例如：

```bash
BENCH_REPEAT=5 BENCH_LLM_JUDGE=true \
  pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:nightly
```

`nightly` 是调度策略，不是配置页中的另一种评测能力。比较性能时优先查看 Nightly/Release 的 median、p95 和波动率。

## 运行产物

默认在 `packages/benchmarks/reports/<北京时间>/` 写入：

```text
reports/2026-08-26_14-30-00/
├── <model>_<scenario>_<run>.json   # 每次模型调用的原始样本
├── report.json                     # 完整机器可读报告
├── report.html                     # 推荐首先查看
└── report_<runDir>.xlsx            # 明细和按场景对比
```

建议按以下顺序阅读：

1. 打开 `report.html` 查看运行健康度、协议失败、p95、Token 和模型对比。
2. 使用 Excel 做筛选或共享明细。
3. 出现异常时查看 `report.json` 和对应原始样本。

## 指标说明

### 可靠性与协议

报告同时给出三个成功率，口径不能混用：

| 指标 | 计算方式 | 用途 |
| --- | --- | --- |
| `requestSuccessRate` | 请求成功数 / 全部协议样本 | 判断模型服务和网络可靠性 |
| `protocolPassRateOnSuccess` | 协议通过数 / 请求成功数 | 判断成功响应中的结构化输出能力 |
| `endToEndSuccessRate` | 协议通过数 / 全部协议样本 | 发布门禁使用，失败请求也算失败 |

逐条结果带有稳定的 `failureTag`：

| Tag | 含义 |
| --- | --- |
| `ok` | 请求成功且协议通过 |
| `timeout` | 请求超时或被中止 |
| `request_error` | 其他请求或流式错误 |
| `no_protocol_block` | 未找到 `schemaJson` 或 `<a2ui-json>` 协议块 |
| `invalid_json` | 找到协议块但 JSON 无法解析 |
| `schema_error` | JSON 可解析但未通过协议 Schema |

开启门禁后，只要 `endToEndSuccessRate < 1`，进程退出码就是非 0。套件默认值可以通过 `BENCH_FAIL_ON_PROTOCOL=true|false` 覆盖。

### 延迟

| 指标 | 含义 |
| --- | --- |
| `firstChunkMs` | 请求到首个文本或推理 chunk；`ttftMs` 是其兼容字段 |
| `firstTextMs` | 请求到首个用户可见文本 chunk |
| `firstObservableComponentMs` | 请求到首次出现可观测 UI 根组件 |
| `totalMs` | 请求开始到流结束的端到端耗时 |
| `tpotMs` | 首个可见文本之后，平均每个输出 Token 的耗时 |

TPOT 使用：

```text
(totalMs - firstTextMs) / (completionTokens - 1)
```

`completionTokens <= 1` 或没有可见文本时不计算 TPOT。`concurrency=1` 更接近单用户体感；并发大于 1 时，延迟应解释为负载下延迟。

### Token 与 Judge

- `promptTokens`、`completionTokens`、`totalTokens`：生成调用的模型 usage。
- `benchTotalTokens`：生成与 Judge 合计 Token。
- `llmJudgeScore`：可选的 1～10 分质量评分。
- `llmJudgeReason`、`llmJudgeError`：Judge 原因或错误。

Judge 默认关闭，因为它会产生额外调用和费用。未指定 `BENCH_LLM_JUDGE_MODEL` 时会复用主模型；正式模型选型建议显式指定独立 Judge。

## 比较两次运行

使用离线 diff 比较两份 `report.json`：

```bash
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:diff -- \
  --baseline reports/<old>/report.json \
  --current reports/<new>/report.json \
  --out reports/<new>/diff.json
```

Diff 比较协议通过率、p95 总耗时和平均 Token，并检查以下实验指纹：

- 协议、框架和 materials 档位。
- 场景集合和 prompt 变体。
- 并发配置。
- system prompt、样本集和 materials hash。

指纹不一致时输出 `fingerprint_mismatch`，仍展示基础信息，但不会生成 `regressions`，避免比较不可比的实验。

当前回归标记规则：

- 协议通过率下降。
- p95 总耗时增长超过 20%，且绝对增长超过 2 秒。
- 平均 Token 增长超过 15%。

## 常用示例

### 指定模型和场景

```bash
BENCH_MODEL=DeepSeek-V3.2 \
BENCH_SCENARIOS=simple-form,table-and-filter \
BENCH_REPEAT=3 \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

### 多模型对比

```bash
BENCH_MODELS=Model-A,Model-B \
BENCH_SCENARIOS=simple-form,form-validation \
BENCH_REPEAT=3 \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

### A2UI 冒烟

```bash
BENCH_PROTOCOL=a2ui \
BENCH_SCENARIOS=simple-form \
BENCH_REPEAT=1 \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

A2UI 的 Schema、协议说明和升级方式见 [docs/a2ui.md](./docs/a2ui.md) 与 `vendor/a2ui/`。

### 启用 Judge

```bash
BENCH_LLM_JUDGE=true \
BENCH_LLM_JUDGE_MODEL=<judge-model-id> \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:release
```

### 限流和重试

```bash
BENCH_CONCURRENCY=4 \
BENCH_MODEL_RATE_LIMIT='{"DeepSeek-V3.2":{"requests":5,"windowMs":60000}}' \
BENCH_RETRY_MAX_ATTEMPTS=5 \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

重试等待和主动限流排队不计入单次响应 `totalMs`，但会记录为 `retryCount`、`retryWaitMs`、`rateLimitQueueWaitMs` 和 `rateLimited`。

## 中断后续跑

运行中断后，指定原 run 目录即可只补缺失样本：

```bash
BENCH_TARGET_SAMPLE_RUN_DIR=2026-08-26_14-30-00 \
BENCH_SKIP_EXISTING_SAMPLES=true \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

- 设置 `BENCH_TARGET_SAMPLE_RUN_DIR` 后不再创建新时间戳目录。
- 指定目标目录时，`BENCH_SKIP_EXISTING_SAMPLES` 默认就是 `true`。
- 需要覆盖已有样本时显式设置 `BENCH_SKIP_EXISTING_SAMPLES=false`。
- 只有生成阶段结束并进入报告阶段后，才会写入或更新报告文件。

续跑前应保持模型、协议、场景、repeat、prompt 和 materials 配置一致。框架会记录这些配置及 hash，混合不同实验会使比较结果失真。

## Full 与 Plain 对照

默认只生成 `full` 样本，即使用 SDK `genPrompt` 产生完整 system prompt。

| 配置 | 生成内容 |
| --- | --- |
| 默认 | 仅 `full` |
| `BENCH_COMPARE_EMPTY_SYSTEM=true` | 同时生成 `full` 和空 system 的 `plain` |
| `BENCH_PLAIN_ONLY=true` | 仅生成 `plain` |

`plain` 用于评估 system prompt 的收益，不参与协议通过率和 Judge。需要把 plain 补到已有 full 运行时，配合 `BENCH_TARGET_SAMPLE_RUN_DIR` 使用。

## 配置参考

配置优先级：

```text
显式 BENCH_* 环境变量 > BENCH_SUITE 预设 > benchmark.config.ts
```

### 常用配置

| 变量 | 说明 |
| --- | --- |
| `BENCH_SUITE` | `smoke`、`nightly` 或 `release` |
| `BENCH_MODEL` | 单模型 ID |
| `BENCH_MODELS` | 逗号分隔的多模型 ID；设置后优先于单模型 |
| `BENCH_PROTOCOL` | `genui` 或 `a2ui` |
| `BENCH_FRAMEWORK` | `Vue` 或 `Angular`；A2UI 下忽略 |
| `BENCH_MATERIALS_VARIANT` | `standard` 或 Vue 的 `mini`；A2UI 下忽略 |
| `BENCH_SCENARIO` | 单场景 ID |
| `BENCH_SCENARIOS` | 逗号分隔的场景 ID，优先于 `BENCH_SCENARIO` |
| `BENCH_REPEAT` | 每个“模型 × 场景”执行次数 |
| `BENCH_CONCURRENCY` | 生成和 Judge 阶段并发数 |
| `BENCH_LLM_JUDGE` | 是否启用 Judge |
| `BENCH_LLM_JUDGE_MODEL` | Judge 模型 ID |
| `BENCH_FAIL_ON_PROTOCOL` | 是否启用端到端协议门禁 |

### 执行控制

| 变量 | 说明 |
| --- | --- |
| `BENCH_STREAM_TIMEOUT_MS` | 单次流式请求超时，默认 600000 ms；`0` 表示不限制 |
| `BENCH_RETRY_MAX_ATTEMPTS` | 最大请求次数，包含首次请求 |
| `BENCH_MODEL_RATE_LIMIT` | 按模型设置滑动窗口限流的 JSON |
| `BENCH_TARGET_SAMPLE_RUN_DIR` | 写入已有 run 目录 |
| `BENCH_SKIP_EXISTING_SAMPLES` | 是否跳过已有样本文件 |

### 输入输出与高级对照

| 变量 | 说明 |
| --- | --- |
| `BENCH_UI` | `false` 时直接运行 CLI |
| `BENCH_MAAS_MODELS_PATH` | 模型 Provider 清单路径 |
| `BENCH_MODELS_FROM_MAAS` | 使用清单中的全部模型 |
| `BENCH_SAMPLES_DIR` | 样本根目录，默认 `packages/benchmarks/reports` |
| `BENCH_OUTPUT_DIR` | 报告输出目录，默认与本次 run 目录一致 |
| `BENCH_WRITE_EXCEL` | 是否生成 Excel，默认 `true` |
| `BENCH_JSON` | 是否在控制台额外打印 JSON |
| `BENCH_COMPARE_EMPTY_SYSTEM` | 同时生成 full 与 plain |
| `BENCH_PLAIN_ONLY` | 仅生成 plain |

布尔值接受 `1`、`true`、`yes` 表示开启；`0`、`false` 等其他非空值表示关闭。未设置、空字符串或纯空白时使用下一级默认值。

## 内置场景

场景位于 `src/samples/`，按以下类别维护：

- `basic`：常规表单、卡片、表格和设置页。
- `complex`：向导、可编辑表格、主从布局和组合仪表盘。
- `constraints`：校验、权限和移动端约束。
- `edge`：空态、长内容和错误重试。
- `contextual`：多轮上下文；GenUI 与 A2UI 使用各自版本。

`getLlmBenchmarkSampleCases(protocol)` 会合并共享场景和当前协议的 contextual 场景。

## 与 SDK 的关系

GenUI 路径直接使用 SDK 与 materials 包提供的能力：

| SDK 能力 | Benchmark 中的用途 |
| --- | --- |
| `genPrompt` + `materialsMeta` | 构建生成阶段 system prompt |
| `PatternExtractor` / `SchemaJsonPattern` | 提取 `schemaJson` 块 |
| `repairJson` | 修复并解析 schema JSON |
| `genRootSchema(whiteList)` | 协议和组件白名单校验 |
| `wrapperComponent` | 识别首个可观测 UI |

`StreamPatternExtractor`、`DeltaPatcher` 和渲染侧默认值映射不属于当前 benchmark 范围，由 core 单测或渲染测试覆盖。

## 代码入口

```text
main.ts                         UI / CLI 入口
src/benchmark.config.ts        默认配置
src/suites.ts                  Smoke / Nightly / Release 预设
src/generate-samples.ts        模型调用、流式指标、重试与样本落盘
src/run-report.ts              协议校验、Judge 和门禁
src/framework/runner.ts        聚合并写出报告
src/utils/health.ts            成功率与失败分类
scripts/diff-reports.mjs       两次报告离线比较
src/protocol/                  GenUI / A2UI 协议实现
src/samples/                   内置场景
```

框架后续演进建议见 [docs/improvement-suggestions.md](./docs/improvement-suggestions.md)。
