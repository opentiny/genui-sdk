# @opentiny/genui-sdk-benchmarks

基于 `@opentiny/genui-sdk-core` 的大模型 **schemaJson 生成** 基准：在线拉流生成样本（DeepSeek / Vercel AI SDK），再离线校验、统计并输出 JSON / HTML 报告。

## 关注指标

- **schemaJson**：代码块是否存在、JSON 是否可解析、`genRootSchema()` 协议是否通过
- **TTFT**：首 Token 延迟
- **总耗时**：端到端（`totalMs`）
- **TPOT**：首 Token 之后平均每输出 Token 耗时（见下文公式）
- **Token**：`promptTokens` / `completionTokens` / `totalTokens`
- **LLM-as-a-Judge**（可选）：对输出质量打分 **1～10**，并给出简要原因

## 目录结构

```text
main.ts                      # 入口：串行 generateSamples → runReport（.env 在包根目录）
package.json                 # 脚本名：benchmarks
src/
├── benchmark.config.ts      # 默认运行项；可被环境变量 BENCH_* 覆盖
├── generate-samples.ts      # 在线生成样本并写入本次 run 目录
├── run-report.ts            # 读取样本、可选 Judge、汇总并写 report.json / report.html
├── framework/
│   ├── types.ts             # LlmBenchmarkRunOptions、样本与结果类型
│   ├── runner.ts            # 报告落盘、HTML、comparisonByScenario 聚合
│   ├── reporter.ts          # 控制台表格与 Summary
│   └── index.ts
├── samples/
│   ├── index.ts             # coreLlmBenchmarkSampleCases（注册内置场景）
│   ├── basic.ts
│   ├── complex.ts
│   ├── edge.ts
│   └── constraints.ts
└── utils/
    ├── index.ts
    ├── env.ts               # BENCH_* 解析
    ├── fs-paths.ts          # reports 根目录、run 目录名、样本文件路径
    ├── tpot.ts              # TPOT 计算
    ├── extract-schema-json.ts
    ├── judge.ts
    ├── resolve-models.ts
    └── number.ts
```

系统提示词由 `genPrompt(render-config, tgCustomConfig)` + `specificPrompt` + `userAppendPrompt` 拼出，与 playground `chat-genui` 思路一致；**无**单独的 `llm.config.ts`。

## 环境与 API Key

在 **本包根目录**（与 `main.ts` 同级）放置 `.env`。可参考 `.env.example`：

- **`DEEPSEEK_API_KEY`**：生成样本必填；Judge 开启时同样需要（或见下方 fallback）。
- **`DEEPSEEK_BASE_URL`**（可选）：自定义 DeepSeek 兼容端点。
- **`OPENAI_API_KEY`**（可选）：当未设置 `DEEPSEEK_API_KEY` 时，生成与 Judge 可回退使用该变量（与代码中 `createDeepSeek` 用法一致）。

布尔型环境变量：未设置或空字符串表示“用 benchmark.config 默认值”；若设置，则 **`1` / `true` / `yes`（大小写不敏感）** 为真。

## 配置项与环境变量（BENCH_*）

| 变量 | 作用 |
| --- | --- |
| `BENCH_MODEL` | 单模型 id（`models` 未配置时生效） |
| `BENCH_MODELS` | 逗号分隔多模型；非空时只跑列表内模型，报告也只统计这些模型 |
| `BENCH_FRAMEWORK` | `Vue` 或 `Angular` |
| `BENCH_SCENARIO` | 单场景 id 过滤 |
| `BENCH_SCENARIOS` | 逗号分隔多场景；**优先级高于** `BENCH_SCENARIO` |
| `BENCH_REPEAT` | 每个「模型 × 场景」重复次数（正整数，默认取自 config） |
| `BENCH_CONCURRENCY` | 生成阶段并发数（正整数，默认取自 config） |
| `BENCH_LLM_JUDGE` | 是否启用 Judge（覆盖 `benchmark.config` 中 `llmJudge.enabled`） |
| `BENCH_LLM_JUDGE_MODEL` | Judge 使用的模型 id（空则复用 `BENCH_MODEL` / config `model`） |
| `BENCH_JSON` | `true` 时控制台输出 JSON；否则表格 + Summary |
| `BENCH_SAMPLES_DIR` | 样本根目录（默认包内上级 `reports/` 的解析路径，见 `resolveSamplesDir`） |
| `BENCH_OUTPUT_DIR` | 报告输出目录（默认与本次 run 目录一致，即生成样本所在目录） |

更细的默认值见 `src/benchmark.config.ts`（含 `promptConfig`、`llmJudge` 等）。

### 内置场景

场景 id 与文案在 `src/samples/*.ts` 中维护，汇总为 `coreLlmBenchmarkSampleCases`。当前 `src/samples/index.ts` 中仅挂载 **basic** 场景（其余类型文件保留供扩展）。

### 多模型与报告过滤

- 配置 **`models` / `BENCH_MODELS`**：只生成并只汇总这些模型的样本。
- **仅配置单个 `model`**：报告若未限定 `models`，会读取目录下**全部** `.json` 样本（便于对比历史 run）。
- 每次运行会在 `reports/` 下新建 **`yyyy-MM-dd_hh-mm-ss`（北京时间）** 子目录；样本文件名为 **`${modelSlug}_${scenario}_${runIndex}.json`**（`modelSlug` 由模型 id 安全化）。

## 运行

在 **仓库根目录**（已配置 `pnpm benchmarks`）：

```bash
pnpm benchmarks
```

或直接：

```bash
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks
```

流程：`generateSamples` 写入本次 `runDir` → `runReport` 将 `samplesDir` 设为该 `runDir`，只统计本次生成的样本。

## 报告产物

写入选定的输出目录（默认同本次样本目录）：

- **`report.json`**：`model`、`models`、`llmJudge`、`comparisonByScenario`（按场景 × 模型：`avgTtftMs`、`avgTotalMs`、`avgTpotMs?`、`avgTotalTokens`、`schemaPassRate` 等）、`generatedAt`、逐条 **`results`**
- **`report.html`**：按场景对比柱状图（含 TTFT、Total、TPOT、Token、Schema 通过率等）与单次运行明细图、明细表

控制台：`json: false` 时打印明细表与 **Benchmark Summary**（含平均 Judge 分、平均 TPOT 等）。

## `results` 逐条字段说明

| 字段 | 含义 |
| --- | --- |
| `scenario` / `runIndex` / `model` | 场景、重复序号、模型 |
| `ttftMs` | 请求到首个输出/推理 delta 的耗时 |
| `totalMs` | 请求到流结束的耗时 |
| `tpotMs` | TPOT（ms/token）：`(totalMs - ttftMs) / (completionTokens - 1)`；`completionTokens ≤ 1` 时省略 |
| `isSchemaJsonBlockFound` | 是否找到 ```schemaJson``` 代码块 |
| `isSchemaJsonValidJson` | 块内是否为合法 JSON |
| `isSchemaJsonValidAgainstProtocol` | 是否通过 `genRootSchema()` |
| `schemaValidationError` | 校验失败时的说明 |
| `promptTokens` / `completionTokens` / `totalTokens` | 模型 usage |
| `rawOutputChars` | 原始文本输出字符数 |
| `llmJudgeScore` | Judge 分数 **1～10**（启用且解析成功时） |
| `llmJudgeReason` / `llmJudgeError` | Judge 原因或错误信息 |
| `errorMessage` | 生成阶段流错误信息（若有） |
