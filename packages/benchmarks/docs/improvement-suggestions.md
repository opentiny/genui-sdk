# GenUI SDK 基准测试：改动建议与细化方案

基于当前 `@opentiny/genui-sdk-benchmarks`（协议门禁 + 五维结论页 + `report.html`），对照 HELM / Artificial Analysis / LLM 性能评测实践整理。  
**原则不变**：协议 ≠ 质量；不做合成总分；报告可离线打开。

---

## 1. 现状与缺口

### 已对齐（保持）

| 实践 | 当前做法 |
|------|----------|
| 多指标、不合成总分 | 五维：协议 / 稳定性 / 性能 / 成本 / 质量 |
| 发布门禁与质量分离 | 协议 = `genRootSchema`；质量 = LLM-as-Judge（可选） |
| 可复现配置 | 配置区 + `report.json`；`BENCH_*` / UI |
| 失败可下钻 | 失败明细；样本 JSON 保留原文 |
| 质量 × 效率 | 多模型：通过率优先，再比 total / tokens |

### 主要缺口

| 缺口 | 证据 | 影响 |
|------|------|------|
| `repeat` 默认 1 | `benchmark.config.ts` | 无组内波动 / 分位数，发版结论偏虚 |
| 只有均值（+ `repeat≥3` 才有 stdev） | `runner.ts` `volatility` | 选型看不到尾部延迟 |
| 无 Smoke/Nightly 套件 | 靠手设 `BENCH_SCENARIOS` | 全量贵、冒烟不标准 |
| 无 baseline diff | 每次独立 `runDir` | 难回答「比上周差了什么」 |
| 失败无稳定标签 | 原文 AJV / 流错误 | 难做专项修复与趋势 |
| Judge 默认可绑被测模型 | `llmJudge.model` 可空 | 质量维易漂 |

---

## 2. 目标态（一句话）

**Smoke 可门禁、Nightly 可回归、Release 可选型**；同一套 `report.json` 契约扩展字段，结论页继续五维叙事，并支持相对 baseline 的 delta。

---

## 3. 分期里程碑

| 阶段 | 主题 | 预估 | 交付物 | 验收 |
|------|------|------|--------|------|
| **M1** | 分位数 + repeat 约定 | 1～2 天 | `comparisonByScenario` / prepare / HTML 含 p50/p95；文档约定套件 repeat | `repeat≥3` 时 HTML 性能表可见 p95；`repeat=1` 时 p95 显示 — 且不报错 |
| **M2** | Smoke / Nightly 套件 | 0.5～1 天 | `BENCH_SUITE` + package scripts + README | `pnpm benchmarks:smoke --cli` 固定场景/模型/repeat 可跑通 |
| **M3** | Baseline diff | 1～2 天 | `scripts/diff-reports.mjs` + 可选 `diff.html` 片段 | 对两个 `report.json` 输出协议/p95/tokens/Judge delta |
| **M4** | 失败标签 | 1 天 | `failureTag` 字段 + 聚合表 | 失败行有标签；结论页有标签计数 |
| **M5** | Judge 规范 | 0.5～1 天 | 固定默认 Judge；`judgeOnlyProtocolPass` | Release 套件默认开启且不评分未过协议样本 |
| **M6** | 成本 / 版本 / 场景标签 | 1～2 天 | 可选价格、package 版本、scenario tags | 配置区可见版本；Smoke 场景覆盖多标签 |

建议严格按 **M1 → M2 → M3 → M4** 推进；M5/M6 可并行穿插。

---

## 4. M1 — 统计可信度（细化）

### 4.1 指标与门槛

对每个 **场景 × 模型** 分组，在现有 `avg*` 上增加：

| 字段 | 条件 | 说明 |
|------|------|------|
| `p50TotalMs` / `p95TotalMs` | `runs ≥ 3` | 端到端总耗时 |
| `p50TtftMs` / `p95TtftMs` | 有效 TTFT 样本 ≥ 3 | 首 token |
| `p50FirstObsMs` / `p95FirstObsMs` | 有效 firstObs ≥ 3 | 首个可观测组件 |
| 现有 `volatility.*Stdev` | 保持 `repeat≥3` 且 `runs≥3` | 与分位数并存 |

算法：排序后线性插值百分位（与常见 bench 一致即可，实现写进 `utils/stats.ts` 的 `percentile(values, p)`）。

`repeat < 3`：**不填**分位数字段（或显式 `null`），HTML 显示 `—`，caption 一句说明「需 repeat≥3」。

### 4.2 数据契约（`comparisonByScenario.byModel` 增量）

```ts
// 示意：挂在现有 byModel[model] 上
{
  avgTotalMs: number;
  p50TotalMs?: number;
  p95TotalMs?: number;
  p50TtftMs?: number;
  p95TtftMs?: number;
  p50FirstObservableComponentMs?: number;
  p95FirstObservableComponentMs?: number;
  volatility?: { /* 已有 */ };
}
```

`prepare-overview.mjs` 的 `scenarios[]` 同步带上上述字段；`modelCompare.rows` 可对跨场景的 p95 再做平均或「最差场景 p95」（Release 选型优先 **最差场景 p95**，文档写清）。

### 4.3 结论页展示

- **性能**：多模型主图优先 `p95 totalMs`（无 p95 时回退 avg）；副标题写清「p95 端到端总耗时」。
- **明细表**：增加可选列 `p95 Total`（Judge 列逻辑不变）。
- **稳定性**：有组内 stdev/CV 时展示；否则只展示「全部通过 / 有失败」。

### 4.4 改动文件

- `src/utils/stats.ts` — `percentile`
- `src/framework/runner.ts` — 聚合写入 p50/p95
- `src/framework/types.ts` — 类型
- `scripts/prepare-overview.mjs` / `render-insights-html.mjs`
- Excel 对比 sheet（若有列扩展，与 JSON 对齐）

### 4.5 并发语义（文档 + 配置展示）

- 配置区已有 Concurrency：补充说明文案（HTML caption 一行即可）。
- README：  
  - `concurrency>1` → **负载下延迟**  
  - 体感对比建议另跑 `BENCH_CONCURRENCY=1`

---

## 5. M2 — 分层套件（细化）

### 5.1 环境变量

| 变量 | 作用 |
|------|------|
| `BENCH_SUITE=smoke\|nightly\|release` | 套用预设；**显式 `BENCH_*` 仍可覆盖单项** |
| 优先级 | 显式 env > suite 预设 > `benchmark.config.ts` |

实现位置：`resolve-run-options.ts`（或新建 `src/suites.ts`）。

### 5.2 套件预设（建议初值）

当前内置场景（来自 `src/samples/*`）：

- basic：`simple-form`, `dashboard-card`, `table-and-filter`, `settings-page`, `order-detail`, `responsive-form`
- contextual：`context-login-form`, `context-user-table`
- constraints：`form-validation`, `permission-ui`, `mobile-priority-page`
- complex：`wizard-form`, `editable-table`, `master-detail`, `chart-dashboard-combo`
- edge：`empty-state-table`, `long-content-card`, `error-retry-panel`

| Suite | models | scenarios | repeat | concurrency | Judge | 门禁 |
|-------|--------|-----------|--------|-------------|-------|------|
| **smoke** | 仅 config 主模型（如 `DeepSeek-V4-Flash`） | `simple-form`, `dashboard-card`, `table-and-filter`, `form-validation`, `permission-ui`, `chart-dashboard-combo`（6 个，覆盖表单/卡片/表/校验/权限/图表） | 1 | 2 | off | 协议通过率 **100%** 否则 exit≠0（可选 flag） |
| **nightly** | 主模型 | **全部**场景 | 3 | 2～5 | off 或 on | 默认只出报告；可选 `BENCH_FAIL_ON_PROTOCOL=true` |
| **release** | `BENCH_MODELS` 或清单子集 | 全部 | 5 | 1（体感）或 2 | **on** + 固定 Judge | 协议门禁 + 报告；选型看 p95/tokens/Judge |

### 5.3 package.json 脚本

```json
"benchmarks:smoke": "BENCH_SUITE=smoke BENCH_UI=false tsx ./main.ts --cli",
"benchmarks:nightly": "BENCH_SUITE=nightly BENCH_UI=false tsx ./main.ts --cli",
"benchmarks:release": "BENCH_SUITE=release BENCH_UI=false tsx ./main.ts --cli"
```

### 5.4 可选 CI 门禁

- `BENCH_FAIL_ON_PROTOCOL=true`：`runReport` 末尾若 `passRate < 1` 则 `process.exitCode = 1`。
- Smoke 默认打开该开关；Nightly 默认关闭。

---

## 6. M3 — Baseline diff（细化）

### 6.1 CLI

```bash
node scripts/diff-reports.mjs \
  --baseline packages/benchmarks/reports/<old>/report.json \
  --current  packages/benchmarks/reports/<new>/report.json \
  --out      packages/benchmarks/reports/<new>/diff.json
```

可选：`--html` 在当前 run 旁写 `diff.html`（或嵌入 `report.html` 一节「相对 baseline」）。

### 6.2 Diff 粒度

1. **全局**：`passRate`、`avgJudgeScore`、`totalTokens`、`benchmarkTotalMs`
2. **按模型**：passRate、avg/p95 total、avg tokens、avg Judge
3. **按场景×模型**（可截断只输出 delta 显著项）：  
   - 协议：pass → fail / fail → pass  
   - `Δp95TotalMs`、`ΔavgTotalTokens`、`Δjudge`

显著阈值建议（可配置）：

- 协议状态翻转：一律列出  
- `|Δp95TotalMs| / baseline ≥ 20%` 且绝对值 ≥ 2s  
- `|Δtokens| / baseline ≥ 15%`

### 6.3 输出结构（示意）

```json
{
  "baseline": { "runDir": "...", "reportPath": "..." },
  "current": { "runDir": "...", "reportPath": "..." },
  "summaryDelta": { "passRate": [-0.02, "0.95→0.93"], "..." : "..." },
  "regressions": [ { "scenario": "...", "model": "...", "kind": "protocol_fail", "detail": "..." } ],
  "improvements": []
}
```

**不做**：自动把两份 run 的样本混跑；diff 纯离线读 JSON。

---

## 7. M4 — 协议失败分类（细化）

### 7.1 标签枚举

| tag | 判定（优先级从上到下） |
|-----|------------------------|
| `stream_error` | 存在 `errorMessage`（生成/超时等） |
| `no_schema_block` | `!isSchemaJsonBlockFound` |
| `invalid_json` | block 找到但 `!isSchemaJsonValidJson` |
| `missing_required` | `schemaValidationError` 匹配 `must have required property` |
| `whitelist` | error 含 whiteList / additional / not allowed component 等（按现有 AJV 文案微调） |
| `protocol_other` | `!isSchemaJsonValidAgainstProtocol` 的其余情况 |
| `ok` | 协议通过（一般不进 failures 列表） |

### 7.2 落盘

- `results[]` 增加 `failureTag?: string`
- `report.json` 增加 `failureByTag: Record<string, number>`
- 结论页失败表：Tag | 场景 | 模型 | 错误摘要  
- Highlights「失败模式」用 tag 聚合，不再只靠英文 raw

### 7.3 改动文件

- `run-report.ts`（打标处，靠近现有校验结果组装）
- `prepare-overview.mjs` / `render-insights-html.mjs`

---

## 8. M5 — Judge 第二轨（细化）

| 项 | 方案 |
|----|------|
| 默认模型 | `benchmark.config` / Release suite：写死例如稳定强模型 id；**禁止**「空则复用被测模型」作为 Release 默认（Smoke/Nightly 仍可空=off） |
| `judgeOnlyProtocolPass` | `true` 时跳过未过协议样本（记 `llmJudgeError: skipped_protocol_fail` 或不上分） |
| 环境变量 | `BENCH_LLM_JUDGE_MODEL`、`BENCH_JUDGE_ONLY_PROTOCOL_PASS` |
| 报告 | 质量维 subtitle：`Judge=<id> · 仅协议通过` |

人工标定（可选、不进主路径）：抽 20 条双人打分算相关，季度做一次即可。

---

## 9. M6 — 成本 / 复现 / 场景标签（细化）

### 9.1 成本

- 可选 `BENCH_PRICE_JSON` 或内置 `prices.example.json`：`{ "ModelId": { "inputPer1M": n, "outputPer1M": n } }`
- `results` / 汇总增加 `estimatedCostUsd?`；无单价则整列省略
- 相对成本：同 run 内 `/ min(modelCost)`

### 9.2 复现性

写入 `report.config`（及 HTML 配置区）：

- `sdkCoreVersion` / `materialsVersion`（读 `package.json` 或 `pnpm-lock`）
- `gitSha`（`git rev-parse --short HEAD`，失败则省略）
- `maasModelsPath`（已解析绝对路径）
- `suite?: smoke|nightly|release`

### 9.3 场景标签

在 `src/samples` 旁增加 `scenario-meta.ts`：

```ts
{ id: 'chart-dashboard-combo', tags: ['chart', 'complex'] }
{ id: 'permission-ui', tags: ['permission', 'form'] }
// ...
```

Smoke 选取规则：**每个主 tag 至少 1 个场景**（与 §5.2 列表一致时可手工固定，meta 用于校验覆盖）。

中长期：结论页按 tag 汇总通过率 / p95。

---

## 10. 与现有模块的映射

```text
suites.ts / resolve-run-options.ts     ← M2 BENCH_SUITE
utils/stats.ts + runner.ts             ← M1 percentile / comparison
run-report.ts                          ← M4 tags, M5 judge filter, M2 exit code
prepare-overview.mjs                   ← M1/M4/M6 展示数据
render-insights-html.mjs               ← 结论页
scripts/diff-reports.mjs               ← M3（新建）
docs/improvement-suggestions.md        ← 本文
README.md                              ← 套件命令与口径
```

**兼容**：旧 `report.json` 无新字段时，prepare/HTML 必须降级显示 `—`，不能抛错。

---

## 11. 建议落地顺序（执行清单）

```text
[ ] M1a  percentile() + runner 写入 p50/p95
[ ] M1b  prepare + HTML 性能/明细列
[ ] M1c  README：repeat / concurrency 口径
[ ] M2a  suites.ts + BENCH_SUITE
[ ] M2b  package scripts smoke/nightly/release
[ ] M2c  BENCH_FAIL_ON_PROTOCOL（smoke 默认开）
[ ] M3a  diff-reports.mjs（JSON）
[ ] M3b  可选 diff 嵌入报告
[ ] M4   failureTag + 聚合 UI
[ ] M5   Judge 默认模型 + onlyProtocolPass
[ ] M6   版本字段 / 可选价格 / scenario tags
```

---

## 12. 明确不做

- 协议 + 延迟 + Judge **合成一个总分**
- 把协议通过率当成「质量」
- 默认 CDN 依赖的报告页
- 为追榜去评测通用 MMLU 等与 GenUI schema 无关的任务集

---

## 13. 参考

### 包内

- 跑测与环境变量：`packages/benchmarks/README.md`

### 业界实践（与本文建议的对应关系）

| 来源 | 核心主张 | 对应本文 |
|------|----------|----------|
| **HELM**（Stanford CRFM） | 场景 × **多指标**；标准化条件；公开配置与 raw 输出；不做单一「最优」 | 五维拆开、配置透明、失败可下钻、禁止合成总分 |
| **Artificial Analysis** | 质量与 **延迟/成本并排**；模型选型看 trade-off | 协议优先再比 total/tokens；成本可决策化 |
| **LMSYS Chatbot Arena** | 相对排序（pairwise）而非绝对「质量分」神话 | Judge 作第二轨，不替代协议门禁 |
| **MLPerf / LLMPerf 类延迟评测** | 报告 **分位数**（p50/p99）与吞吐；区分负载 | `repeat` + p50/p95；标注 concurrency |
| **EvalPlus / HumanEval+** | 更严的正确性门禁；失败可复现 | 协议漏斗（block→JSON→schema）；失败分类 |
| **LLM-as-a-Judge 文献** | 用强模型评生成质量；需控偏差与标度 | 固定 Judge 模型；协议通过后再打分 |

### 链接

**多指标 / 透明评测**

- HELM 论文：[Holistic Evaluation of Language Models](https://arxiv.org/abs/2211.09110)（TMLR 2023）
- HELM 主页 / Classic leaderboard：[crfm.stanford.edu/helm](https://crfm.stanford.edu/helm/classic/latest/)
- HELM 代码：[github.com/stanford-crfm/helm](https://github.com/stanford-crfm/helm)
- HELM 介绍博文（CRFM）：[Language Models are Changing AI: The Need for Holistic Evaluation](https://crfm.stanford.edu/2022/11/17/helm.html)

**质量 × 效率 / 选型榜**

- Artificial Analysis：[artificialanalysis.ai](https://artificialanalysis.ai/)
- LMSYS Chatbot Arena：[lmarena.ai](https://lmarena.ai/) · 论文 [Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena](https://arxiv.org/abs/2306.05685)

**延迟、吞吐、分位数**

- MLPerf Inference：[mlcommons.org/benchmarks/inference](https://mlcommons.org/benchmarks/inference/)
- LLMPerf：[github.com/ray-project/llmperf](https://github.com/ray-project/llmperf)
- NVIDIA GenAI-Perf：[docs.nvidia.com — GenAI-Perf](https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/perf_analyzer/genai-perf/README.html)

**正确性门禁 / 可复现失败**

- EvalPlus：[evalplus.github.io](https://evalplus.github.io/leaderboard.html) · [arxiv.org/abs/2305.01210](https://arxiv.org/abs/2305.01210)
- BigCode Evaluation Harness：[github.com/bigcode-project/bigcode-evaluation-harness](https://github.com/bigcode-project/bigcode-evaluation-harness)

**LLM-as-a-Judge**

- MT-Bench / Arena Judge：[arxiv.org/abs/2306.05685](https://arxiv.org/abs/2306.05685)
- G-Eval：[arxiv.org/abs/2303.16634](https://arxiv.org/abs/2303.16634)

> GenUI 基准的「协议合规」更接近 **结构化输出 / schema 门禁**，不是通用知识榜；上表借鉴的是 **评测方法论**（多指标、分位数、透明配置、失败可检查），而非照搬其任务集。
