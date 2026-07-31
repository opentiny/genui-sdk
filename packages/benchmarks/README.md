# @opentiny/genui-sdk-benchmarks

验证 **SDK 核心能力**（非演练场）：以 `@opentiny/genui-sdk-core` 的 `genPrompt` + materials 包 `materialsMeta` 生成 system，驱动大模型输出 **schemaJson**，再用 `genRootSchema()` 等协议校验。模型 Provider 仅作跑数基建。

## 关注指标

- **schemaJson**：代码块是否存在、JSON 是否可解析、`genRootSchema()` 协议是否通过
- **TTFT**：首 Token 或首段 **reasoning-delta** 的延迟（以流中首次计入为准）
- **总耗时**：端到端（`totalMs`）
- **TPOT**：首 Token 之后平均每输出 Token 耗时（见下文公式）
- **Token**：`promptTokens` / `completionTokens` / `totalTokens`
- **LLM-as-a-Judge**（可选）：对输出质量打分 **1～10**，并给出简要原因

## 与 SDK 主包的关系

对齐方式与 [core README](../core/README.md) / materials 包文档一致：

```ts
import { genPrompt } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/meta';

const system = genPrompt('Vue', materialsMeta, tgCustomConfig);
```

- **会随依赖自动跟上**：`genPrompt` 拼装逻辑、`materialsMeta` / `miniMaterialsMeta` 内容、`genRootSchema` 协议。
- **升级 SDK 后**：重装 workspace 依赖并跑一次烟雾即可；无需与 playground 同步。
- **`BENCH_MATERIALS_VARIANT`**：在 materials 包导出的 `materialsMeta`（standard）与 Vue `miniMaterialsMeta`（mini）之间选择，不是演练场配置。
- **`specificPrompt` / `userAppendPrompt`**：基准侧可选附加约束（如要求 ````schemaJson```` 包裹），不属于 core API。

### 核心能力覆盖（相对 `@opentiny/genui-sdk-core`）

| Core 能力 | 基准用法 |
|-----------|----------|
| `genPrompt` + materials `materialsMeta` | 生成阶段 system（默认 full，非 plain） |
| `PatternExtractor` / `SchemaJsonPattern` | 报告阶段提取 ```schemaJson``` |
| `repairJson` | 解析 schema 块（与渲染器路径一致） |
| `genRootSchema(whiteList)` | 协议校验（whiteList 来自 materialsMeta） |
| `wrapperComponent` | 首个可观测容器耗时（Vue `TinyCard` / Angular `TiCard`） |
| `StreamPatternExtractor` / `DeltaPatcher` | **不在本基准范围**（流式增量 patch；由 core 单测覆盖） |
| `buildMaterialDefaultValueMap` | **不在本基准范围**（渲染侧） |

默认配置走 **full system（`genPrompt`）**；`BENCH_PLAIN_ONLY` / `BENCH_COMPARE_EMPTY_SYSTEM` 仅用于对照实验。

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
│   ├── constraints.ts
│   └── contextual.ts
└── utils/
    ├── index.ts
    ├── env.ts               # BENCH_* 解析（含 envStreamTimeoutMs）
    ├── fs-paths.ts          # reports 根目录、run 目录名、样本文件路径
    ├── tpot.ts              # TPOT 计算
    ├── extract-schema-json.ts
    ├── judge.ts
    ├── resolve-models.ts
    ├── resolve-ai-sdk-model.ts   # 按 BENCH_MAAS_MODELS_PATH 读清单，构造 AI SDK model
    ├── stream-text-usage.ts      # resolveStreamTextUsage、benchStreamTextAbortSignal（streamText 超时）
    ├── first-observable-component.ts
    ├── excel-detail-rows.ts      # Excel「明细」行
    ├── comparison-scenario-label.ts
    ├── stats.ts
    ├── maas-manifest-models.ts   # resolveMaasModelsJsonPath、listMaasManifestModelNames（BENCH_MAAS_MODELS_PATH）
    └── number.ts
```

系统提示词：`genPrompt(framework, materialsMeta|miniMaterialsMeta, tgCustomConfig)`（SDK 主路径），再按需拼接 `specificPrompt` / `userAppendPrompt`。

### `maas-models.json` 路径（`BENCH_MAAS_MODELS_PATH`）

| 用途 | 实现 | 说明 |
| --- | --- | --- |
| **解析模型实例**（实际请求） | `resolve-ai-sdk-model.ts` | 通过 **`resolveMaasModelsJsonPath()`**（与下表同源）读取 `BENCH_MAAS_MODELS_PATH` 指向的清单，构建 `ProviderModelMapper` 与 AI SDK model。 |
| **枚举多模型名称列表** | `maas-manifest-models.ts` | `listMaasManifestModelNames()` 同样使用 **`resolveMaasModelsJsonPath()`**。 |

须在 **`packages/benchmarks/.env`** 中配置 **API Key**（见 `.env.example`）。`BENCH_MAAS_MODELS_PATH` 可选：未设置时默认使用仓库内 `sites/playground/server/maas-models.json`（仅作 Provider 基建）。该路径用于解析模型实例发请求；与 `modelsFromMaasManifest` / `BENCH_MODELS_FROM_MAAS` 无关——后两者只控制是否用清单**枚举**多模型名。

## 环境与 API Key

在 **本包根目录**（与 `main.ts` 同级）放置 `.env`。可参考 `.env.example`。

- **API Key / Base URL 的环境变量名**由 `maas-models.json`（及你配置的 `BENCH_MAAS_MODELS_PATH`）里各 provider 的 **`apiKeyEnvName`**、**`baseUrlEnvName`** 决定；仓库自带清单里常见为 **`DEEPSEEK_API_KEY`**，可选 **`DEEPSEEK_BASE_URL`** 覆盖默认 `baseUrl`。
- 须在 `.env` 中设置 **`BENCH_MAAS_MODELS_PATH`** 指向 `maas-models.json`（见上文「`maas-models.json` 路径」）；未设置或仅空白会在枚举模型名或解析模型实例时抛错。

布尔型环境变量：未设置、空字符串或**仅空白**表示「用 `benchmark.config.ts` 默认值」；若去掉首尾空白后非空，则 **`1`**、**`true`**、**`yes`**（后两者**大小写不敏感**）为真，其它非空值（如 `false`、`0`）为假。

## 配置项与环境变量（BENCH_*）

| 变量 | 作用 |
| --- | --- |
| `BENCH_MODEL` | 单模型 id；与 `BENCH_MODELS` / 配置里的 `models` **至少其一非空**即可；仅多模型时可不设此项 |
| `BENCH_MODELS` | 逗号分隔多模型；非空时只跑列表内模型，报告也只统计这些模型 |
| `BENCH_FRAMEWORK` | `Vue` 或 `Angular` |
| `BENCH_MATERIALS_VARIANT` | `standard`（默认，`materialsMeta`）或 `mini`（Vue `miniMaterialsMeta`）。勿与样本的 `promptVariant`（full/plain）混淆 |
| `BENCH_SCENARIO` | 单场景 id 过滤 |
| `BENCH_SCENARIOS` | 逗号分隔多场景；**优先级高于** `BENCH_SCENARIO` |
| `BENCH_REPEAT` | 每个「模型 × 场景」重复次数（正整数，默认取自 config） |
| `BENCH_CONCURRENCY` | 生成阶段并发数（正整数，默认取自 config） |
| `BENCH_STREAM_TIMEOUT_MS` | 单次 `streamText` 超时（毫秒）；默认 `600000`（10 分钟）；**`0`** 表示不启用超时（生成与 Judge 均适用） |
| `BENCH_LLM_JUDGE` | 是否启用 Judge（覆盖 `benchmark.config` 中 `llmJudge.enabled`） |
| `BENCH_LLM_JUDGE_MODEL` | Judge 使用的模型 id（空则复用主模型：显式 `model`，否则为 `models` 首项） |
| `BENCH_JSON` | `true` 时控制台输出 JSON；否则表格 + Summary |
| `BENCH_WRITE_EXCEL` | 是否生成 `report_<runDir>.xlsx`（`runDir` 为本次样本/报告所在子目录名；默认 `true`） |
| `BENCH_MODELS_FROM_MAAS` | 为真且 **`models` 在 config 中为空** 时，用 `BENCH_MAAS_MODELS_PATH` 清单中的模型名作为多模型列表（config 里 `modelsFromMaasManifest: true` 时不必再设此项） |
| `BENCH_MAAS_MODELS_PATH` | `maas-models.json`：**绝对路径**，或相对 **benchmarks 包根目录**（与 `main.ts`、`.env` 同级）。**枚举模型名**与 **`resolveAiSdkModelForBench` 解析实例**共用此路径；未设置或仅空白会报错（见 `.env.example`） |
| `BENCH_COMPARE_EMPTY_SYSTEM` | 在**非**「仅 plain」模式下，是否额外生成空 system 对照样本（`*_plain.json`） |
| `BENCH_PLAIN_ONLY` | 仅生成 plain、不生成 full（常与 `TARGET` 配合向已有 run 补文件） |
| `BENCH_TARGET_SAMPLE_RUN_DIR` | 样本与报告写入**已有**子目录（相对样本根目录或绝对路径），不再新建北京时间戳目录 |
| `BENCH_SKIP_EXISTING_SAMPLES` | 目标样本 `.json` 已存在则跳过 API。未设置时：**指定了 `TARGET` 则默认 `true`**（便于续跑），否则 `false` |
| `BENCH_SAMPLES_DIR` | 样本根目录（默认：`packages/benchmarks/reports`，见 `resolveSamplesDir`） |
| `BENCH_OUTPUT_DIR` | 报告输出目录（默认与本次 run 目录一致） |

`src/benchmark.config.ts` 中对各配置项的默认值有更细的说明（含 `promptConfig`、`llmJudge`、`streamTimeoutMs`、`modelsFromMaasManifest`、`compareEmptySystem` / `compareEmptySystemPlainOnly` 等）。

### 默认「样本变体」行为（`benchmark.config.ts`）

生成逻辑见 `generate-samples.ts`：

- **`compareEmptySystemPlainOnly === true`（仅 plain）**：每个任务只写 **空 system** 的 `*_plain.json`，不写 full。
- **`compareEmptySystem === true` 且 plainOnly 为 false**：每个「模型 × 场景 × run」写 **full + plain** 各一份。
- **二者均为 false（默认）**：只写 **full**（走 `genPrompt` 主路径）。

## 中断后继续

生成阶段进程**被中断或手动停止**后，可在**相同模型 / 场景 / repeat 配置**下接着补全，无需对已落盘的样本重复请求 API：

1. 设置 **`BENCH_TARGET_SAMPLE_RUN_DIR`** 为**已有样本所在子目录**（相对默认样本根目录 `reports/` 下的目录名，或绝对路径），本次不再新建北京时间戳目录。
2. **`BENCH_SKIP_EXISTING_SAMPLES`**：未设置时，只要指定了 `TARGET`，**默认为 `true`**——目标路径上已存在的 `*.json` 会跳过生成（日志含 `skip existing`），只补缺失任务。
3. 若要**整目录覆盖重跑**，设 **`BENCH_SKIP_EXISTING_SAMPLES=false`**。
4. 入口仍是 **`generateSamples` → `runReport` 串行**：只有本次命令**完整跑完生成并进入报告阶段**，才会写出/更新 `report.json`、`report.html`、`report_<runDir>.xlsx`。若上次在报告前中断，续跑命令结束后会一并补报告。

示例（将目录名换成你的 run）：

```bash
BENCH_TARGET_SAMPLE_RUN_DIR=2026-05-09_09-52-03 pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks
```

### 内置场景

场景 id 与文案在 `src/samples/*.ts` 中维护，汇总为 **`coreLlmBenchmarkSampleCases`**，当前包含：

- **basic**、**complex**、**edge**、**constraints**、**contextual**（见 `src/samples/index.ts` 的展开顺序）。

### 多模型与报告过滤

- 配置 **`models` / `BENCH_MODELS`**：只生成并只汇总这些模型的样本。
- **仅配置单个 `model`**（且未限定 `models`）：报告若未限定 `models`，会读取目录下**全部** `.json` 样本（便于对比历史 run）。
- 默认每次在样本根目录下新建 **`yyyy-MM-dd_hh-mm-ss`（北京时间）** 子目录；若设置 `BENCH_TARGET_SAMPLE_RUN_DIR` 则写入该目录、不新建时间戳。
- 样本文件名：**`${modelSlug}_${scenario}_${runIndex}.json`**（plain 为 **`_${runIndex}_plain.json`** 后缀形式，即 `..._${runIndex}_plain.json`；`modelSlug` 为「文件安全可读前缀 + 下划线 + 模型 id 的 SHA256 十二位十六进制」，避免不同 id 经截断后撞名覆盖）。
- **中断后继续**：见上文「[中断后继续](#中断后继续)」。

## 运行

在 **仓库根目录**：

```bash
pnpm benchmarks
```


流程：`generateSamples` 写入本次 `runDir` → `runReport` 将 `samplesDir` 设为该 `runDir`，只统计本次生成的样本。

## 报告产物

写入选定的输出目录（默认同本次样本目录）：

- **`report.json`**：`model`、`models`、`repeat`、`benchmarkTotalMs`（自入口 `main` 起至写出报告的总耗时 ms，未计时时可能缺省）、`llmJudge`、`comparisonByScenario`（按场景 × 模型：`avgTtftMs`、`avgTotalMs`、`avgTpotMs?`、`avgTotalTokens`、`schemaPassRate` 等）、`generatedAt`、逐条 **`results`**
- **`report.html`**：按场景对比柱状图（含 TTFT、Total、TPOT、Token、Schema 通过率等）与单次运行明细图、明细表
- **`report_<runDir>.xlsx`**（未关 `BENCH_WRITE_EXCEL` 时）：`runDir` 为输出目录文件夹名。含 **`明细`**：`model`、`scenario`、`runIndex`、`totalMs`、`tpsMs`（列名如此，数值为 **TPOT**，单位 ms/token）、`promptTokens`、`completionTokens`、`totalTokens`、`llmJudgeScore`、`llmJudgeReason`、`llmJudgeError`、`llmJudgeInputTokens`、`llmJudgeOutputTokens`、`errorMessage`、`promptVariant`、`generatedAt`；另含 **`按场景对比`**。「明细」仅指标与短文本列，**不含**模型原始输出 / schemaJson（完整内容见同目录 `report.json` 与样本 `*.json`）。开启 **`BENCH_LLM_JUDGE`** 且提供商在响应中返回 usage 时，`llmJudgeInputTokens` / `llmJudgeOutputTokens` 才有值；`report.json` 的 `results` 中对应字段为 `llmJudgePromptTokens` / `llmJudgeCompletionTokens` / `llmJudgeTotalTokens` 与 `benchTotalTokens` 等（与 Excel 列名以 JSON 为准）。

控制台：`json: false` 时打印明细表与 **Benchmark Summary**（含平均 Judge 分、平均 TPOT 等）。

## `results` 逐条字段说明

| 字段 | 含义 |
| --- | --- |
| `scenario` / `runIndex` / `model` | 场景、重复序号、模型 |
| `promptVariant` | `full` 或 `plain`（空 system 对照） |
| `ttftMs` | 请求到首个 **text-delta** 或 **reasoning-delta** 的耗时 |
| `totalMs` | 请求到流结束的耗时 |
| `firstObservableComponentMs` | 输出中首次出现 `TinyCard` 的耗时（未出现则缺省） |
| `tpotMs` | TPOT（ms/token）：`(totalMs - ttftMs) / (completionTokens - 1)`；`completionTokens ≤ 1` 时省略 |
| `isSchemaJsonBlockFound` | 是否解析到 ```schemaJson``` 代码块 |
| `isSchemaJsonValidJson` | 块内是否为合法 JSON |
| `isSchemaJsonValidAgainstProtocol` | 是否通过 `genRootSchema()` |
| `schemaValidationError` | 校验失败时的说明 |
| `promptTokens` / `completionTokens` / `totalTokens` | 模型 usage（报告不含缓存分项） |
| `benchTotalTokens` | 生成 + Judge 合计 token（未开 Judge 或未返回 usage 时等于 `totalTokens`） |
| `rawOutputChars` | 原始文本输出字符数 |
| `llmJudgeScore` | Judge 分数 **1～10**（启用且解析成功时） |
| `llmJudgeReason` / `llmJudgeError` | Judge 原因或错误信息 |
| `llmJudgePromptTokens` / `llmJudgeCompletionTokens` / `llmJudgeTotalTokens` | Judge 调用的 usage（启用报告阶段 Judge 且 API 返回时有效） |
| `errorMessage` | 生成阶段流错误信息（若有） |
