# @opentiny/genui-sdk-benchmarks

Validate the structured UI generation capability of GenUI SDK: protocol compliance, reliability, latency, tokens, and optional generation quality (LLM Judge).

| Protocol | Output | Validation |
| --- | --- | --- |
| `genui` (default) | `schemaJson` | `genRootSchema()` |
| `a2ui` | `<a2ui-json>` | A2UI v0.9.1 Schema + AJV |

```text
Pick model & scenario → call model, persist samples → protocol validation (optional Judge) → aggregate metrics → JSON / HTML / Excel
```

## Table of Contents

- [Quick Start](#quick-start)
- [Reading the Report](#reading-the-report)
- [Metric Definitions](#metric-definitions)
- [Common Commands](#common-commands)
- [Configuration Reference](#configuration-reference)
- [Protocol Differences](#protocol-differences)
- [Code Entry Points](#code-entry-points)

## Quick Start

### 1. Configure credentials

At the repository root:

```bash
cp packages/benchmarks/.env.example packages/benchmarks/.env
```

Fill in the keys per the `apiKeyEnvName` in the model manifest (the default manifest commonly uses `DEEPSEEK_API_KEY` / `DEEPSEEK_BASE_URL`).  
Default manifest: `sites/playground/server/maas-models.json`; override with `BENCH_MAAS_MODELS_PATH`.

### 2. Run it

Local debugging (opens the config page, default `127.0.0.1:3847`):

```bash
pnpm benchmarks
```

The config page has "Quick Check / Full Benchmark / Custom" presets — just fill in the form, and you can still edit afterwards. "Quick Check" is only a smoke test and must not be treated as a performance conclusion.

Headless run from config:

```bash
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

After the run, open `packages/benchmarks/reports/<Beijing time>/report.html` first.

Rough task volume: `number of models × number of scenarios × repeat × prompt variants` (`full + plain` is 2). Full manifest × all scenarios × high repeat is expensive; for daily use prefer "Quick Check" or `benchmarks:smoke`.

## Reading the Report

Default output directory: `packages/benchmarks/reports/<Beijing time>/`

```text
reports/2026-08-26_14-30-00/
├── <model>_<scenario>_<run>.json   # raw samples
├── report.json                     # full machine-readable data
├── report.html                     # look at this first
└── report_<runDir>.xlsx            # detail / per-scenario comparison
```

Suggested order: `report.html` (health, protocol failures, p95, tokens, model comparison) → filter in Excel → if anything looks off, review `report.json` and the samples.

## Metric Definitions

### Reliability & Protocol

The three success rates **must not be used interchangeably** (only samples counted toward the protocol gate; `plain` excluded):

| Metric | Formula | Purpose |
| --- | --- | --- |
| `requestSuccessRate` | successful requests / all protocol samples | service & network reliability |
| `protocolPassRateOnSuccess` | protocol passed / successful requests | structured output capability among successful responses |
| `endToEndSuccessRate` | protocol passed / all protocol samples | **release gate** (failed requests count as failures too) |

`failureTag`:

| Tag | Meaning |
| --- | --- |
| `ok` | request succeeded and protocol passed |
| `timeout` | timeout or aborted |
| `request_error` | other request / stream errors |
| `no_protocol_block` | no `schemaJson` or `<a2ui-json>` |
| `invalid_json` | block present but JSON is unparseable |
| `schema_error` | valid JSON but fails the protocol Schema |

When the gate is enabled, `endToEndSuccessRate < 1` → non-zero exit code. Override suite defaults with `BENCH_FAIL_ON_PROTOCOL=true|false`.

### Latency

| Metric | Meaning |
| --- | --- |
| `firstChunkMs` | first text or reasoning chunk (`ttftMs` is its compatible field) |
| `firstTextMs` | first user-visible text chunk |
| `firstObservableComponentMs` | first observable UI root (GenUI: `wrapperComponent`; A2UI: `"id":"root"`) |
| `totalMs` | request start to stream end |
| `tpotMs` | `(totalMs - firstTextMs) / (completionTokens - 1)`; skipped when token≤1 |

`concurrency=1` approximates single-user feel; concurrency > 1 should be read as latency under load. For performance comparison, prefer the Nightly / Release median, p95, and variance.

### Tokens & Judge

- Generation: `promptTokens` / `completionTokens` / `totalTokens`
- `benchTotalTokens`: generation + Judge
- `llmJudgeScore` (1–10) plus `llmJudgeReason` / `llmJudgeError`

Judge is off by default. When `BENCH_LLM_JUDGE_MODEL` is unset, the main model is reused; for formal evaluation, a dedicated Judge model is recommended. `plain` does not run Judge and is not counted toward protocol pass rate.

## Common Commands

### Automation suites (CI / scheduled)

| Command | Config | Protocol gate | Purpose |
| --- | --- | --- | --- |
| `benchmarks:smoke` | 6 representative scenarios, repeat=1, concurrency=2 | on | catch obvious errors fast |
| `benchmarks:nightly` | all scenarios, repeat=3, concurrency=2 | off | daily trend, fewer false blockers |
| `benchmarks:release` | all scenarios, repeat=5, concurrency=1 | on | release gate |

```bash
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:smoke
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:nightly
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:release
```

`smoke` scenarios: `simple-form`, `dashboard-card`, `table-and-filter`, `form-validation`, `permission-ui`, `chart-dashboard-combo`.  
`nightly` is a scheduling policy, not another capability in the config page; individual items can be overridden with explicit `BENCH_*`.

### Specific model / scenarios

```bash
BENCH_MODEL=DeepSeek-V3.2 \
BENCH_SCENARIOS=simple-form,table-and-filter \
BENCH_REPEAT=3 \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

Multiple models: `BENCH_MODELS=Model-A,Model-B` (comma-separated, takes precedence over a single model).

### A2UI smoke test

```bash
BENCH_PROTOCOL=a2ui \
BENCH_SCENARIOS=simple-form \
BENCH_REPEAT=1 \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

### Enabling Judge

```bash
BENCH_LLM_JUDGE=true \
BENCH_LLM_JUDGE_MODEL=<judge-model-id> \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:release
```

### Comparing two runs

```bash
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:diff -- \
  --baseline reports/<old>/report.json \
  --current reports/<new>/report.json \
  --out reports/<new>/diff.json
```

Compares protocol pass rate, p95 total time, average tokens, and validates the experiment fingerprint (protocol / framework / materials, scenario & prompt variants, concurrency, system / sample set / materials hash). A fingerprint mismatch outputs `fingerprint_mismatch` and generates no `regressions`.

Regression markers: protocol pass rate drop; p95 total time ↑≥20% with absolute value ≥2s; average tokens ↑≥15%.

### Resuming after an interruption

```bash
BENCH_TARGET_SAMPLE_RUN_DIR=2026-08-26_14-30-00 \
BENCH_SKIP_EXISTING_SAMPLES=true \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

When a target directory is set, existing samples are skipped by default; override with `BENCH_SKIP_EXISTING_SAMPLES=false`. A resumed run must keep model, protocol, scenarios, repeat, prompt, and materials consistent. The report is only written after the generation phase completes.

### Rate limiting & retries

```bash
BENCH_CONCURRENCY=4 \
BENCH_MODEL_RATE_LIMIT='{"DeepSeek-V3.2":{"requests":5,"windowMs":60000}}' \
BENCH_RETRY_MAX_ATTEMPTS=5 \
pnpm --filter @opentiny/genui-sdk-benchmarks benchmarks:cli
```

Retry waits and rate-limit queueing are not counted in a single `totalMs`; they are recorded in `retryCount` / `retryWaitMs` / `rateLimitQueueWaitMs` / `rateLimited`.

### Full / Plain comparison

| Config | Generation |
| --- | --- |
| default | only `full` (full system) |
| `BENCH_COMPARE_EMPTY_SYSTEM=true` | `full` + `plain` with empty system |
| `BENCH_PLAIN_ONLY=true` | only `plain` |

`plain` measures the system prompt benefit and does not participate in protocol pass rate or Judge; combine with `BENCH_TARGET_SAMPLE_RUN_DIR` when appending to an existing full run.

## Configuration Reference

Precedence (recorded here only):

```text
Config page form (UI runs only)
> explicit BENCH_* environment variables
> BENCH_SUITE preset
> benchmark.config.ts
```

### Which models the CLI eventually runs

```text
BENCH_MODELS
> non-empty models in suite / config
> all manifest models when BENCH_MODELS_FROM_MAAS=true
> BENCH_MODEL
> model in suite / config
```

After clicking "Start" on the config page, the form takes precedence: with "Use all manifest models" enabled it runs all manifest models, otherwise it runs the checked ones. Custom models must first be added to the manifest (or go through the CLI with a resolvable Provider).

Report main model: explicit `model`, otherwise the first item of `models`. Same for Judge; when unset it reuses the main model.

### Environment variables

| Variable | Description |
| --- | --- |
| `BENCH_SUITE` | `smoke` / `nightly` / `release` |
| `BENCH_MODEL` / `BENCH_MODELS` | single model; or multiple models (takes precedence) |
| `BENCH_PROTOCOL` | `genui` \| `a2ui` |
| `BENCH_FRAMEWORK` | `Vue` \| `Angular`; ignored under A2UI |
| `BENCH_MATERIALS_VARIANT` | `standard` \| Vue `mini`; ignored under A2UI |
| `BENCH_SCENARIO` / `BENCH_SCENARIOS` | single scenario; or multiple scenarios (takes precedence) |
| `BENCH_REPEAT` | times per "model × scenario" |
| `BENCH_CONCURRENCY` | concurrency for generation and Judge |
| `BENCH_LLM_JUDGE` / `BENCH_LLM_JUDGE_MODEL` | whether to Judge; Judge model |
| `BENCH_FAIL_ON_PROTOCOL` | end-to-end protocol gate |
| `BENCH_STREAM_TIMEOUT_MS` | per-stream timeout, default `600000`; `0` disables |
| `BENCH_RETRY_MAX_ATTEMPTS` | max number of requests (including the first) |
| `BENCH_MODEL_RATE_LIMIT` | per-model sliding-window rate limit JSON |
| `BENCH_TARGET_SAMPLE_RUN_DIR` | write into an existing run |
| `BENCH_SKIP_EXISTING_SAMPLES` | whether to skip existing samples |
| `BENCH_UI` | runs CLI directly when `false` |
| `BENCH_MAAS_MODELS_PATH` | model manifest path |
| `BENCH_MODELS_FROM_MAAS` | use all manifest models |
| `BENCH_SAMPLES_DIR` / `BENCH_OUTPUT_DIR` | samples root / report directory |
| `BENCH_WRITE_EXCEL` / `BENCH_JSON` | Excel; extra JSON to console |
| `BENCH_COMPARE_EMPTY_SYSTEM` / `BENCH_PLAIN_ONLY` | full+plain / plain only |

Booleans: `1` / `true` / `yes` enable; `0` / `false` etc. (non-empty) disable; unset falls back to the next level's default. More comments in `.env.example`.

### Built-in scenarios

Defined in `src/samples/`:

- `basic`: forms, cards, tables, settings pages, etc.
- `complex`: wizards, editable tables, master-detail, combined dashboards, etc.
- `constraints`: validation, permissions, mobile
- `edge`: empty states, long content, error retry
- `contextual`: multi-turn; one each for GenUI / A2UI

Merged via `getLlmBenchmarkSampleCases(protocol)` combining shared scenarios with the current protocol's contextual ones.

## Protocol Differences

### With the SDK (GenUI)

| SDK | Benchmark use |
| --- | --- |
| `genPrompt` + `materialsMeta` | generation-phase system |
| `PatternExtractor` / `SchemaJsonPattern` | extract `schemaJson` |
| `repairJson` | repair and parse (GenUI only) |
| `genRootSchema(whiteList)` | protocol + whitelist |
| `wrapperComponent` | first observable UI |

`StreamPatternExtractor`, `DeltaPatcher`, and render-default-value mapping are outside this package's scope.

### A2UI

Under the same model / scenario / repeat, `BENCH_PROTOCOL=genui` and `a2ui` each run **once**, then compare pass rate, latency / tokens with `benchmarks:diff`.

| Item | Description |
| --- | --- |
| Schema | pinned **v0.9.1** + Basic Catalog at `vendor/a2ui/` (see that directory's README for upgrades) |
| System | `src/protocol/a2ui/prompt.ts` (official DirectJson assembly); no dependency on the Python `a2ui-agent-sdk` |
| Ignored | `framework` / `materialsVariant` / GenUI `specificPrompt`; **no** `repairJson` (asymmetric with GenUI) |
| Validation | all `<a2ui-json>` → parse → AJV (field names still use the legacy `isSchemaJson*`) |
| Contextual | `contextual-a2ui.ts`; re-record: `pnpm exec tsx ./scripts/capture-a2ui-contextual.mts` |

## Code Entry Points

```text
main.ts                      UI / CLI
src/benchmark.config.ts      default config
src/suites.ts                smoke / nightly / release
src/generate-samples.ts      call model, streaming metrics, retries, persist
src/run-report.ts            protocol validation, Judge, gate
src/framework/runner.ts      aggregate and write reports
src/utils/health.ts          success rate and failure classification
scripts/diff-reports.mjs     offline comparison of two reports
src/protocol/                GenUI / A2UI
vendor/a2ui/                 A2UI schema / rules pin
src/samples/                 scenarios
```
