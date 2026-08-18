#!/usr/bin/env node
/**
 * Flatten packages/benchmarks report.json into a compact payload for Canvas embedding.
 *
 * Usage:
 *   node prepare-overview.mjs path/to/report.json
 *   node prepare-overview.mjs --latest
 *   node prepare-overview.mjs --latest --pretty
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isPlainPromptVariant(r) {
  return (r?.promptVariant ?? 'full') === 'plain';
}

function countsTowardProtocolGate(r) {
  return !isPlainPromptVariant(r);
}

export function findRepoRoot(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 12; i++) {
    if (fs.existsSync(path.join(dir, 'packages', 'benchmarks', 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

export function findLatestReport(reportsRoot) {
  if (!fs.existsSync(reportsRoot)) throw new Error(`Reports dir not found: ${reportsRoot}`);
  const dirs = fs
    .readdirSync(reportsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (let i = dirs.length - 1; i >= 0; i--) {
    const candidate = path.join(reportsRoot, dirs[i], 'report.json');
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`No report.json under ${reportsRoot}`);
}

function avg(values) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (!xs.length) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function round(n, d = 1) {
  if (n == null || !Number.isFinite(n)) return null;
  const p = 10 ** d;
  return Math.round(n * p) / p;
}

/**
 * 协议门禁文案：通用漏斗用语，避免写死 GenUI（schemaJson / genRootSchema）。
 * 可选带协议名，便于对照实验。
 */
export function protocolGateCopy(protocol) {
  const id = protocol === 'a2ui' || protocol === 'genui' ? protocol : null;
  return {
    id,
    displayName: id ?? '—',
    blockLabel: '抽出协议块',
    blockSub: '输出中的协议围栏 / 标签块',
    jsonLabel: 'JSON 可解析',
    jsonSub: '块内容能 parse',
    passLabel: '协议通过',
    passSub: '符合当前协议 schema',
    funnelCaption:
      '下图按场景看协议通过率。上方三格是校验漏斗：抽出协议块 → JSON 可解析 → 协议通过。',
    allPassDetail: (runs) => `全部 ${runs} 次运行通过协议校验${id ? `（${id}）` : ''}。`,
  };
}

/**
 * Derive short actionable conclusions (HELM-style: quality + efficiency, not one score).
 */
function buildInsights(payload) {
  const insights = [];
  const { summary, scenarios, failures, source, config } = payload;
  const models = source?.models ?? [];
  const passRate = summary.runs ? summary.pass / summary.runs : 0;
  const gate = protocolGateCopy(config?.protocol);

  if (passRate >= 1) {
    insights.push({
      tone: 'success',
      title: '协议门禁全部通过',
      detail: gate.allPassDetail(summary.runs),
    });
  } else if (passRate >= 0.85) {
    insights.push({
      tone: 'warning',
      title: '接近通过，仍有协议失败',
      detail: `${summary.fail}/${summary.runs} 次未通过协议校验（通过率 ${Math.round(passRate * 100)}%）。`,
    });
  } else {
    insights.push({
      tone: 'danger',
      title: '协议门禁未通过',
      detail: `仅 ${summary.pass}/${summary.runs} 次通过（${Math.round(passRate * 100)}%）。建议先修协议失败，再谈性能与成本。`,
    });
  }

  const sortedByTotal = [...scenarios].sort((a, b) => (b.avgTotalMs ?? 0) - (a.avgTotalMs ?? 0));
  const slowest = sortedByTotal.slice(0, 3).filter((s) => s.avgTotalMs != null);
  if (slowest.length) {
    insights.push({
      tone: 'info',
      title: '端到端总耗时偏高的场景',
      detail: slowest
        .map((s) => `${s.scenario} ${round(s.avgTotalMs / 1000, 1)}s`)
        .join(' · '),
    });
  }

  const failedScenarios = failures.map((f) => f.scenario);
  if (failedScenarios.length) {
    const patterns = failures.map((f) => {
      const m = String(f.error || '').match(/must have required property '([^']+)'/);
      return m ? `缺少字段 '${m[1]}'` : '协议/其它错误';
    });
    const uniq = [...new Set(patterns)];
    insights.push({
      tone: 'danger',
      title: '失败模式',
      detail: `${[...new Set(failedScenarios)].join('、')} → ${uniq.join('；')}。优先修 prompt / 协议约束，不要用 Judge 分数掩盖协议失败。`,
    });
  }

  if (models.length > 1) {
    const ranked = [...(payload.modelCompare?.rows || [])];
    if (ranked.length >= 2) {
      const best = ranked[0];
      const worst = ranked[ranked.length - 1];
      insights.push({
        tone: 'info',
        title: '模型排序（先通过率，再耗时）',
        detail: `最优：${best.model}（通过率 ${best.passRatePct}% · 平均 ${round((best.avgTotalMs || 0) / 1000, 1)}s）。靠后：${worst.model}（${worst.passRatePct}% · ${round((worst.avgTotalMs || 0) / 1000, 1)}s）。`,
      });
    } else {
      insights.push({
        tone: 'info',
        title: '多模型对比',
        detail: '先看协议通过率，再比较平均总耗时与 token。',
      });
    }
  }

  if (summary.avgTtftMs != null && summary.avgTotalMs != null && summary.avgTtftMs > 0) {
    const ttftShare = summary.avgTtftMs / summary.avgTotalMs;
    if (ttftShare < 0.2) {
      insights.push({
        tone: 'neutral',
        title: '耗时主要花在生成长度上',
        detail: `首 token（TTFT）约占端到端 ${Math.round(ttftShare * 100)}% — 优化输出体积 / completion tokens 比优化首包更有效。`,
      });
    }
  }

  return insights;
}

function stdev(values) {
  const xs = values.filter((v) => typeof v === 'number' && Number.isFinite(v));
  if (xs.length < 2) return null;
  const m = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

/**
 * Five decision dimensions for the conclusions page.
 * Protocol = release gate; quality is Judge-only (never conflated with pass rate).
 */
function buildDimensions(results, summary, scenarioRows, config) {
  const protocolResults = results.filter(countsTowardProtocolGate);
  const n = protocolResults.length;
  const blockFound = protocolResults.filter((r) => r.isSchemaJsonBlockFound).length;
  const validJson = protocolResults.filter((r) => r.isSchemaJsonValidJson).length;
  const protocolOk = protocolResults.filter((r) => r.isSchemaJsonValidAgainstProtocol).length;
  const streamOk = results.filter((r) => !r.errorMessage).length;
  const scenarioProtocolRows = scenarioRows.filter((s) => !String(s.scenario || '').includes('（纯文本）'));
  const scenarioFullPass = scenarioProtocolRows.filter((s) => (s.schemaPassRate ?? 0) >= 1).length;
  const scenarioFullPassRate = scenarioProtocolRows.length
    ? scenarioFullPass / scenarioProtocolRows.length
    : 1;
  const totals = scenarioRows.map((s) => s.avgTotalMs).filter((v) => typeof v === 'number' && Number.isFinite(v));
  const meanTotal = avg(totals);
  const totalStdev = stdev(totals);
  const latencyCv =
    meanTotal && totalStdev != null && meanTotal > 0 ? round(totalStdev / meanTotal, 3) : null;

  const withVol = scenarioRows.filter((s) => s.totalMsStdev != null);
  const hasRepeatVolatility = withVol.length > 0;
  const avgTotalCvRepeat =
    hasRepeatVolatility
      ? round(
          avg(
            withVol
              .map((s) =>
                s.avgTotalMs && s.avgTotalMs > 0 ? s.totalMsStdev / s.avgTotalMs : null,
              )
              .filter((v) => typeof v === 'number' && Number.isFinite(v)),
          ),
          3,
        )
      : null;

  const judgeScores = results
    .map((r) => r.llmJudgeScore)
    .filter((s) => typeof s === 'number' && Number.isFinite(s));
  const judgeErrors = results.filter((r) => r.llmJudgeError).length;
  const judgeEnabled = Boolean(summary.judgeEnabled || config?.llmJudgeEnabled);
  const allN = results.length;
  const avgTokens = allN ? round(summary.totalTokens / allN, 0) : null;

  const protocolRate = n ? protocolOk / n : 1;
  const streamOkRate = allN ? streamOk / allN : 0;
  // Cross-scenario full-pass + stream health; when repeat≥3, also factor repeat CV (lower better).
  let stabilityScore = streamOkRate * 0.35 + scenarioFullPassRate * 0.65;
  if (avgTotalCvRepeat != null) {
    const cvPenalty = Math.min(1, avgTotalCvRepeat);
    stabilityScore = stabilityScore * 0.7 + (1 - cvPenalty) * 0.3;
  }

  const gate = protocolGateCopy(config?.protocol);

  return {
    protocol: {
      id: 'protocol',
      label: '协议合规',
      tone: protocolRate >= 1 ? 'success' : protocolRate >= 0.85 ? 'warning' : 'danger',
      headline: n ? `${protocolOk}/${n}` : '—',
      sub: n ? `${Math.round(protocolRate * 100)}% protocol` : '—',
      detail: `三层校验通过数：抽出协议块 ${blockFound}/${n || 0} · JSON 可解析 ${validJson}/${n || 0} · 协议通过 ${protocolOk}/${n || 0}${gate.id ? `（${gate.id}）` : ''}`,
      blockFound,
      validJson,
      protocolOk,
      runs: n,
      blockFoundRate: n ? round(blockFound / n, 4) : 0,
      validJsonRate: n ? round(validJson / n, 4) : 0,
      protocolRate: round(protocolRate, 4),
      gate,
    },
    stability: {
      id: 'stability',
      label: '生成稳定性',
      tone:
        stabilityScore >= 0.95 ? 'success' : stabilityScore >= 0.8 ? 'warning' : 'danger',
      headline: `${Math.round(scenarioFullPassRate * 100)}%`,
      sub: '组合全部通过',
      detail: hasRepeatVolatility
        ? `全部通过 ${scenarioFullPass}/${scenarioProtocolRows.length}（该场景每次重复都过协议；纯文本对照已排除）。组内耗时波动 CV≈${avgTotalCvRepeat ?? '—'}（同场景多次重复的标准差/均值，越低越稳）。`
        : `全部通过 ${scenarioFullPass}/${scenarioProtocolRows.length}（该「场景×模型」组合都过协议；纯文本对照已排除）。${
            (config?.repeat ?? 1) < 3
              ? `本次只跑了 ${config?.repeat ?? 1} 次，看不出同场景反复跑的波动。`
              : ''
          }${
            latencyCv != null
              ? `场景间耗时差 CV=${latencyCv}（各场景平均总耗时的标准差÷均值；越大说明有的场景特别慢、有的特别快）。`
              : ''
          }`,
      streamOkRate: round(streamOkRate, 4),
      scenarioFullPass: scenarioFullPass,
      scenarioCount: scenarioProtocolRows.length,
      scenarioFullPassRate: round(scenarioFullPassRate, 4),
      latencyCvAcrossScenarios: latencyCv,
      repeatLatencyCv: avgTotalCvRepeat,
      hasRepeatVolatility,
      repeat: config?.repeat ?? 1,
    },
    performance: {
      id: 'performance',
      label: '性能',
      tone: 'info',
      headline: summary.avgTotalMs == null ? '—' : `${round(summary.avgTotalMs / 1000, 1)}s`,
      sub: '平均端到端总耗时',
      detail: `指标均为端到端：平均总耗时（totalMs） ${summary.avgTotalMs == null ? '—' : `${round(summary.avgTotalMs / 1000, 1)}s`} · 首 token TTFT ${summary.avgTtftMs ?? '—'}ms · 首个可观测组件 firstObs ${summary.avgFirstObsMs ?? '—'}ms · TPOT ${summary.avgTpotMs ?? '—'} ms/tok`,
      avgTtftMs: summary.avgTtftMs,
      avgFirstObsMs: summary.avgFirstObsMs,
      avgTotalMs: summary.avgTotalMs,
      avgTpotMs: summary.avgTpotMs,
    },
    cost: {
      id: 'cost',
      label: '成本',
      tone: 'info',
      headline: avgTokens == null ? '—' : `${avgTokens}`,
      sub: '平均 tokens / 次',
      detail: `合计 token ${summary.totalTokens ?? 0}；墙钟时间（整次跑测从开始到结束的真实耗时，含并发等待） ${
        summary.benchmarkTotalMs == null ? '—' : fmtWall(summary.benchmarkTotalMs)
      }`,
      avgTokens,
      totalTokens: summary.totalTokens,
      wallMs: summary.benchmarkTotalMs,
    },
    quality: {
      id: 'quality',
      label: '质量',
      tone: !judgeEnabled
        ? 'neutral'
        : judgeScores.length === 0
          ? 'warning'
          : summary.avgJudgeScore >= 7
            ? 'success'
            : summary.avgJudgeScore >= 5
              ? 'warning'
              : 'danger',
      headline: !judgeEnabled
        ? '未启用'
        : summary.avgJudgeScore == null
          ? '无分数'
          : String(summary.avgJudgeScore),
      sub: judgeEnabled ? `Judge ${judgeScores.length}/${n}` : 'LLM-as-Judge',
      detail: !judgeEnabled
        ? '开启 BENCH_LLM_JUDGE 后显示 1–10 分（与协议通过率分开）'
        : `平均分 ${summary.avgJudgeScore ?? '—'} · 已评分 ${judgeScores.length}/${n}${
            judgeErrors ? ` · 评分失败 ${judgeErrors}` : ''
          }`,
      enabled: judgeEnabled,
      avgJudgeScore: summary.avgJudgeScore,
      scored: judgeScores.length,
      judgeErrors,
    },
  };
}

function fmtWall(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)} 分钟`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} 秒`;
  return `${Math.round(ms)} ms`;
}

export function prepare(report, reportPath) {
  const results = Array.isArray(report.results) ? report.results : [];
  const models = [
    ...new Set(
      (report.models?.length ? report.models : results.map((r) => r.model)).filter(Boolean),
    ),
  ];

  const protocolResults = results.filter(countsTowardProtocolGate);
  const pass = protocolResults.filter((r) => r.isSchemaJsonValidAgainstProtocol).length;
  const fail = protocolResults.length - pass;

  const comparison = Array.isArray(report.comparisonByScenario) ? report.comparisonByScenario : [];

  /** One row per scenario×model for charts/tables */
  const scenarioRows = [];
  if (comparison.length) {
    for (const row of comparison) {
      for (const [model, stats] of Object.entries(row.byModel || {})) {
        scenarioRows.push({
          scenario: row.scenario,
          model,
          runs: stats.runs ?? 1,
          schemaPassRate: stats.schemaPassRate ?? 0,
          avgTtftMs: round(stats.avgTtftMs, 0),
          avgTotalMs: round(stats.avgTotalMs, 0),
          avgTpotMs: round(stats.avgTpotMs, 2),
          avgFirstObsMs: round(stats.avgFirstObservableComponentMs, 0),
          avgTotalTokens: round(stats.avgTotalTokens, 0),
          ...(stats.volatility
            ? {
                ttftMsStdev: round(stats.volatility.ttftMsStdev, 0),
                firstObsMsStdev: round(stats.volatility.firstObservableComponentMsStdev, 0),
                totalMsStdev: round(stats.volatility.totalMsStdev, 0),
                tpotMsStdev: round(stats.volatility.tpotMsStdev, 2),
                totalTokensStdev: round(stats.volatility.totalTokensStdev, 0),
              }
            : {}),
        });
      }
    }
  } else {
    const byKey = new Map();
    for (const r of results) {
      const key = `${r.scenario}::${r.model}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(r);
    }
    for (const [key, group] of byKey) {
      const [scenario, model] = key.split('::');
      scenarioRows.push({
        scenario,
        model,
        runs: group.length,
        schemaPassRate: (() => {
          const scored = group.filter(countsTowardProtocolGate);
          if (scored.length === 0) return 1;
          return scored.filter((g) => g.isSchemaJsonValidAgainstProtocol).length / scored.length;
        })(),
        avgTtftMs: round(avg(group.map((g) => g.ttftMs)), 0),
        avgTotalMs: round(avg(group.map((g) => g.totalMs)), 0),
        avgTpotMs: round(avg(group.map((g) => g.tpotMs)), 2),
        avgFirstObsMs: round(avg(group.map((g) => g.firstObservableComponentMs)), 0),
        avgTotalTokens: round(avg(group.map((g) => g.totalTokens)), 0),
      });
    }
  }

  // Attach Judge averages (comparisonByScenario 不含 judge 字段)
  const judgeByKey = new Map();
  for (const r of results) {
    const label =
      (r.promptVariant ?? 'full') === 'plain' ? `${r.scenario}（纯文本）` : r.scenario;
    const key = `${label}::${r.model}`;
    if (!judgeByKey.has(key)) judgeByKey.set(key, []);
    if (typeof r.llmJudgeScore === 'number' && Number.isFinite(r.llmJudgeScore)) {
      judgeByKey.get(key).push(r.llmJudgeScore);
    }
  }
  for (const row of scenarioRows) {
    const scores = judgeByKey.get(`${row.scenario}::${row.model}`) || [];
    row.avgJudgeScore = scores.length ? round(avg(scores), 2) : null;
  }

  const failures = results
    .filter(
      (r) =>
        countsTowardProtocolGate(r)
          ? !r.isSchemaJsonValidAgainstProtocol || r.errorMessage
          : Boolean(r.errorMessage),
    )
    .map((r) => ({
      scenario: r.scenario,
      model: r.model,
      promptVariant: r.promptVariant ?? 'full',
      runIndex: r.runIndex ?? 1,
      error: r.errorMessage || r.schemaValidationError || 'protocol validation failed',
    }));

  const summary = {
    runs: results.length,
    pass,
    fail,
    protocolRuns: protocolResults.length,
    passRate: protocolResults.length ? round(pass / protocolResults.length, 4) : 1,
    avgTtftMs: round(avg(results.map((r) => r.ttftMs)), 0),
    avgTotalMs: round(avg(results.map((r) => r.totalMs)), 0),
    avgTpotMs: round(avg(results.map((r) => r.tpotMs)), 2),
    avgFirstObsMs: round(avg(results.map((r) => r.firstObservableComponentMs)), 0),
    totalTokens: results.reduce((s, r) => s + (r.totalTokens || 0), 0),
    avgPromptTokens: round(avg(results.map((r) => r.promptTokens)), 0),
    avgCompletionTokens: round(avg(results.map((r) => r.completionTokens)), 0),
    benchmarkTotalMs: report.benchmarkTotalMs ?? null,
    judgeEnabled: Boolean(report.llmJudge?.enabled || report.config?.llmJudgeEnabled),
    avgJudgeScore: round(
      avg(results.map((r) => r.llmJudgeScore).filter((s) => typeof s === 'number')),
      2,
    ),
  };

  // Prefer report.model as chart primary when present in the run
  const primaryModel =
    (report.model && models.includes(report.model) ? report.model : null) ||
    models[0] ||
    report.model ||
    'model';
  const forPrimary = scenarioRows
    .filter((s) => s.model === primaryModel)
    .sort((a, b) => a.scenario.localeCompare(b.scenario));

  const chart = {
    categories: forPrimary.map((s) => s.scenario),
    passRatePct: forPrimary.map((s) => round((s.schemaPassRate || 0) * 100, 0)),
    totalSec: forPrimary.map((s) => round((s.avgTotalMs || 0) / 1000, 1)),
    ttftSec: forPrimary.map((s) => round((s.avgTtftMs || 0) / 1000, 2)),
    firstObsSec: forPrimary.map((s) =>
      s.avgFirstObsMs == null ? null : round((s.avgFirstObsMs || 0) / 1000, 2),
    ),
    tokensK: forPrimary.map((s) => round((s.avgTotalTokens || 0) / 1000, 1)),
    /** Stacked latency composition (ms): ttft / to-first-obs / remainder */
    latencyStack: forPrimary.map((s) => {
      const total = s.avgTotalMs ?? 0;
      const ttft = Math.min(s.avgTtftMs ?? 0, total);
      const firstObs = Math.min(s.avgFirstObsMs ?? ttft, total);
      const mid = Math.max(0, firstObs - ttft);
      const rest = Math.max(0, total - firstObs);
      return { ttft, mid, rest, total };
    }),
  };

  // Quality×efficiency points for table callouts (higher pass, lower latency preferred)
  const tradeoff = forPrimary.map((s) => ({
    scenario: s.scenario,
    quality: round((s.schemaPassRate || 0) * 100, 0),
    latencySec: round((s.avgTotalMs || 0) / 1000, 1),
    tokens: s.avgTotalTokens,
  }));

  /** Cross-model aggregates for comparison charts / ranking (empty when single model). */
  const modelCompareRows = models.map((model) => {
    const modelResults = results.filter((r) => r.model === model);
    const protocolModelResults = modelResults.filter(countsTowardProtocolGate);
    const runs = modelResults.length;
    const protocolRuns = protocolModelResults.length;
    const pass = protocolModelResults.filter((r) => r.isSchemaJsonValidAgainstProtocol).length;
    const judgeScores = modelResults
      .map((r) => r.llmJudgeScore)
      .filter((s) => typeof s === 'number' && Number.isFinite(s));
    return {
      model,
      runs,
      pass,
      passRatePct: protocolRuns ? round((pass / protocolRuns) * 100, 0) : 100,
      avgTtftMs: round(avg(modelResults.map((r) => r.ttftMs)), 0),
      avgTotalMs: round(avg(modelResults.map((r) => r.totalMs)), 0),
      avgTpotMs: round(avg(modelResults.map((r) => r.tpotMs)), 2),
      avgFirstObsMs: round(avg(modelResults.map((r) => r.firstObservableComponentMs)), 0),
      avgTotalTokens: round(avg(modelResults.map((r) => r.totalTokens)), 0),
      avgJudgeScore: round(avg(judgeScores), 2),
      judgeScored: judgeScores.length,
    };
  });
  modelCompareRows.sort(
    (a, b) =>
      b.passRatePct - a.passRatePct ||
      (a.avgTotalMs ?? Number.POSITIVE_INFINITY) - (b.avgTotalMs ?? Number.POSITIVE_INFINITY),
  );
  const modelCompare =
    models.length > 1
      ? {
          rows: modelCompareRows,
          chart: {
            categories: modelCompareRows.map((r) => r.model),
            passRatePct: modelCompareRows.map((r) => r.passRatePct),
            totalSec: modelCompareRows.map((r) => round((r.avgTotalMs || 0) / 1000, 1)),
            ttftSec: modelCompareRows.map((r) => round((r.avgTtftMs || 0) / 1000, 2)),
            tokensK: modelCompareRows.map((r) => round((r.avgTotalTokens || 0) / 1000, 1)),
          },
        }
      : null;

  const cfg = report.config && typeof report.config === 'object' ? report.config : {};
  const derivedScenarios = [...new Set(scenarioRows.map((s) => s.scenario))].sort();
  const derivedPromptVariants = [
    ...new Set(results.map((r) => r.promptVariant ?? 'full').filter(Boolean)),
  ].sort();

  const config = {
    runDir: cfg.runDir ?? path.basename(path.dirname(reportPath)),
    protocol: cfg.protocol === 'a2ui' || cfg.protocol === 'genui' ? cfg.protocol : 'genui',
    framework: cfg.framework ?? null,
    materialsVariant: cfg.materialsVariant ?? null,
    models: Array.isArray(cfg.models) && cfg.models.length ? cfg.models : models,
    scenarios: Array.isArray(cfg.scenarios) && cfg.scenarios.length ? cfg.scenarios : derivedScenarios,
    promptVariants:
      Array.isArray(cfg.promptVariants) && cfg.promptVariants.length
        ? cfg.promptVariants
        : derivedPromptVariants,
    repeat: cfg.repeat ?? report.repeat ?? 1,
    concurrency: cfg.concurrency ?? null,
    streamTimeoutMs: cfg.streamTimeoutMs ?? null,
    compareEmptySystem: Boolean(cfg.compareEmptySystem),
    compareEmptySystemPlainOnly: Boolean(cfg.compareEmptySystemPlainOnly),
    llmJudgeEnabled: Boolean(cfg.llmJudgeEnabled ?? report.llmJudge?.enabled),
    llmJudgeModel: cfg.llmJudgeModel ?? report.llmJudge?.model ?? null,
  };

  const payload = {
    source: {
      reportPath,
      generatedAt: report.generatedAt ?? null,
      model: report.model ?? primaryModel,
      models,
      repeat: report.repeat ?? 1,
    },
    config,
    summary,
    dimensions: buildDimensions(results, summary, scenarioRows, config),
    scenarios: scenarioRows.sort((a, b) => a.scenario.localeCompare(b.scenario)),
    failures,
    chart,
    tradeoff,
    modelCompare,
    insights: [],
  };
  payload.insights = buildInsights(payload);
  return payload;
}

function parseArgs(argv) {
  const args = { latest: false, pretty: false, repoRoot: undefined, reportPath: undefined };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--latest') args.latest = true;
    else if (a === '--pretty') args.pretty = true;
    else if (a === '--repo-root') args.repoRoot = argv[++i];
    else if (!a.startsWith('-')) args.reportPath = a;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let reportPath = args.reportPath;
  if (args.latest || !reportPath) {
    const repoRoot =
      args.repoRoot ||
      findRepoRoot(process.cwd()) ||
      findRepoRoot(path.resolve(__dirname, '../../..'));
    if (!repoRoot) {
      console.error('Could not find repo root. Pass --repo-root or a report path.');
      process.exit(1);
    }
    reportPath = findLatestReport(path.join(repoRoot, 'packages', 'benchmarks', 'reports'));
  }
  reportPath = path.resolve(reportPath);
  if (!fs.existsSync(reportPath)) {
    console.error(`Missing: ${reportPath}`);
    process.exit(1);
  }
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const payload = prepare(report, reportPath);
  process.stdout.write(JSON.stringify(payload, null, args.pretty ? 2 : 0) + '\n');
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
