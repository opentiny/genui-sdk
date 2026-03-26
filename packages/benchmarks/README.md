# @opentiny/genui-benchmarks

`@opentiny/genui-sdk-core` 的大模型生成基准测试框架，聚焦四个指标：

- `schemaJson` 合法性（代码块存在 / JSON 可解析 / 协议校验）
- 首字节生成速度（TTFT）
- 任务完成速度（total latency）
- token 消耗量（prompt / completion / total）

## 目录结构

```text
main.ts                    # 入口：串行 generateSamples → runReport
src/
├── benchmark.config.ts    # 运行默认项（可被 .env 中 BENCH_* 覆盖）
├── framework/
│   ├── types.ts
│   ├── reporter.ts
│   ├── runner.ts
│   └── index.ts
├── samples/
│   └── index.ts
├── utils/
│   ├── extract-schema-json.ts
│   ├── fs-paths.ts
│   └── resolve-models.ts
├── llm.config.ts          # system prompt 片段（与 chat-genui 对齐）
├── generate-samples.ts
├── run-report.ts
└── index.ts
```

## 配置

1. **默认值**：编辑 `src/benchmark.config.ts`（`model`、`models`（多模型）、`framework`、`scenario/scenarios`、`repeat`、`json`、`samplesDir`、`outputDir` 等）。
2. **覆盖**：在包根目录复制 `.env.example` 为 `.env`，设置 `BENCH_*` 变量（见 `.env.example`）。
3. **API**：样本生成使用 DeepSeek，需配置 `DEEPSEEK_API_KEY`（见 `.env.example`）。

场景过滤、重复与多模型：

- `BENCH_SCENARIOS`（逗号分隔）优先级高于 `BENCH_SCENARIO`
- `BENCH_REPEAT` 控制**每个模型 × 每个场景**的执行次数（默认 `1`）
- `BENCH_MODELS`（逗号分隔）与配置项 `models`：多模型时逐模型生成样本；报告 HTML/JSON 中按场景聚合对比（多次 run 取均值），明细表含 `model` 列
- 仅配置 `BENCH_MODEL` / `model` 时：只跑一个模型；报告若未设置 `BENCH_MODELS`，会读入样本目录下**全部** `.json`（便于对比历史多模型文件）
- 设置 `BENCH_MODELS` / `models` 后，报告阶段**只统计**这些模型的样本文件
- 样本文件：`${scenario}__${modelSlug}__run-${n}.json`，避免多模型与多轮覆盖

## 运行

一键执行（先在线生成样本，再离线统计并写报告）：

```bash
pnpm --filter @opentiny/genui-benchmarks benchmark
```

报告默认输出到 `samples/reports/`：

- `benchmark-latest.json`（含 `models`、`comparisonByScenario`、逐条 `results`）
- `benchmark-latest.html`（含「按场景 · 模型对比」分组柱状图 + 单次运行明细图）

## 输出说明

- `isSchemaJsonBlockFound`: 是否检测到 ```schemaJson ...``` 代码块
- `isSchemaJsonValidJson`: 代码块内容是否为合法 JSON
- `isSchemaJsonValidAgainstProtocol`: 是否通过 `genRootSchema()` 协议校验
- `ttftMs`: 从请求发出到首个输出 token 的耗时
- `totalMs`: 请求到完整结束耗时
- `promptTokens` / `completionTokens` / `totalTokens`: 由模型 usage 返回的 token 统计
