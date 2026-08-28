---
name: benchmark-report-summary
description: >-
  汇总 GenUI SDK Benchmark 的 report.json / report.html，提炼运行健康、协议合规、稳定性、性能、Token、Judge、失败原因和可选 baseline 回归结论。用于用户要求解读、汇总、复盘或比较 benchmark 报告时；不用于重新生成样本或修改评分规则。
---

# Benchmark 报告汇总

默认输出中文，先给结论，再给证据。以 `report.json` 为事实来源；`report.html` 只用于视觉核验，不从页面文案反推指标。

## 选择输入

1. 用户指定 `report.json`、报告目录或 run 名称时使用该报告。
2. 用户未指定时，从 `packages/benchmarks/reports/` 选择目录名按时间排序的最新 `report.json`：

```bash
find packages/benchmarks/reports -mindepth 2 -maxdepth 2 -name report.json -type f | sort | tail -1
```

3. 用户要求回归比较时还需要 baseline。未指定 baseline 不要自行把任意旧报告当基线；可以汇总当前报告并说明缺少 baseline。
4. 报告缺失或 JSON 无法解析时停止，不要自动重跑生成或 Judge。重新跑测会产生模型调用和费用，必须由用户明确要求。

## 分析口径

读取并交叉检查这些字段（旧报告缺字段时显示“无数据”，不要按 0 处理）：

- 运行范围：`config`、`runMetadata.configSnapshot`、模型、协议、框架、materials、场景、repeat、并发、prompt 变体、Judge 配置。
- 健康度：`healthSummary` 与 `runSummary`，区分请求失败、重试、限流和端到端失败。
- 协议：`requestSuccessRate`、`protocolPassRateOnSuccess`、`endToEndSuccessRate`，三者不可混称“通过率”。
- 性能：优先 median、p95、firstText、firstObservable、totalMs 和 TPOT；并发大于 1 时注明这是负载下延迟。
- 成本：生成 Token 与 Judge Token 分开；只有字段存在时才报告合计。
- 质量：只统计实际获得 `llmJudgeScore` 的样本。请求失败、plain 和协议校验失败样本不参与评分，也不算 Judge 失败。
- 失败：按 `failureTag` 汇总，再从 `results` 和同目录原始样本定位模型、场景、变体与错误信息。

遵守以下解释约束：

- 请求失败计入端到端失败，但不参与协议条件通过率和性能分布。
- plain 是空 system 基线，不参与协议通过率和 Judge。
- 协议不通过的结构化输出不参与 Judge；不要用缺失分数拉低平均分。
- 多模型比较先比较端到端与协议合规，再比较延迟、Token 和 Judge；不要生成单一综合总分。
- repeat 小于 3 时，不把场景间 CV 描述成重复稳定性。
- 样本量很小时明确写出 `n`，避免把观察结果表述成稳定结论。

## Baseline 比较

优先复用仓库脚本，将临时结果写到 `/tmp`：

```bash
node packages/benchmarks/scripts/diff-reports.mjs \
  --baseline <baseline/report.json> \
  --current <current/report.json> \
  --out /tmp/benchmark-diff.json
```

只有 `comparable=true` 才给出回归结论。若为 `fingerprint_mismatch`，列出协议、框架、materials、场景、prompt 变体、并发和 hash 的差异，只做并排观察，不标记回归。沿用脚本门槛，不另造标准：

- 协议通过率下降；
- p95 增长超过 20% 且绝对增长超过 2 秒；
- 平均 Token 增长超过 15%。

## 输出格式

按有数据的部分输出，避免空章节：

```markdown
## 结论
一句话说明是否健康、是否可用于决策，以及最重要的问题。

## 运行范围
模型 / 协议 / 场景 / repeat / 并发 / 变体 / Judge / 样本量。

## 核心指标
用紧凑表格列出请求健康、协议、性能、Token、Judge；注明分母和样本量。

## 失败与异常
按优先级列出请求失败、协议失败、Judge 错误、重试/限流，并定位模型与场景。

## 回归对比
仅在提供可比 baseline 时输出 delta、触发规则和受影响场景。

## 建议
给出 1–3 条可执行建议，区分必须修复与建议复测。
```

结论中引用实际 run 目录和报告路径。用户只要简短摘要时压缩篇幅，但仍保留分母、样本量和不可比性说明。
