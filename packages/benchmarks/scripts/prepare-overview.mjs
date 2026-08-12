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
 * Derive short actionable conclusions (HELM-style: quality + efficiency, not one score).
 */
function buildInsights(payload) {
  const insights = [];
  const { summary, scenarios, failures, source } = payload;
  const models = source?.models ?? [];
  const passRate = summary.runs ? summary.pass / summary.runs : 0;

  if (passRate >= 1) {
    insights.push({
      tone: 'success',
      title: 'Schema protocol gate passed',
      detail: `All ${summary.runs} runs validated against genRootSchema.`,
    });
  } else if (passRate >= 0.85) {
    insights.push({
      tone: 'warning',
      title: 'Near-pass with protocol regressions',
      detail: `${summary.fail} of ${summary.runs} runs failed schema validation (${Math.round(passRate * 100)}% pass).`,
    });
  } else {
    insights.push({
      tone: 'danger',
      title: 'Schema protocol gate failing',
      detail: `Only ${summary.pass}/${summary.runs} runs passed (${Math.round(passRate * 100)}%). Treat as release blocker until fixed.`,
    });
  }

  const sortedByTotal = [...scenarios].sort((a, b) => (b.avgTotalMs ?? 0) - (a.avgTotalMs ?? 0));
  const slowest = sortedByTotal.slice(0, 3).filter((s) => s.avgTotalMs != null);
  if (slowest.length) {
    insights.push({
      tone: 'info',
      title: 'Latency hotspots (end-to-end)',
      detail: slowest
        .map((s) => `${s.scenario} ${round(s.avgTotalMs / 1000, 1)}s`)
        .join(' · '),
    });
  }

  const failedScenarios = failures.map((f) => f.scenario);
  if (failedScenarios.length) {
    const patterns = failures.map((f) => {
      const m = String(f.error || '').match(/must have required property '([^']+)'/);
      return m ? `missing '${m[1]}'` : 'protocol/other';
    });
    const uniq = [...new Set(patterns)];
    insights.push({
      tone: 'danger',
      title: 'Failure pattern',
      detail: `${failedScenarios.join(', ')} → ${uniq.join('; ')}. Prefer prompt/materials fixes over raising judge scores.`,
    });
  }

  if (models.length > 1) {
    const ranked = [...(payload.modelCompare?.rows || [])];
    if (ranked.length >= 2) {
      const best = ranked[0];
      const worst = ranked[ranked.length - 1];
      insights.push({
        tone: 'info',
        title: 'Model ranking (pass → latency)',
        detail: `Best: ${best.model} (${best.passRatePct}% pass, ${round((best.avgTotalMs || 0) / 1000, 1)}s avg). Lowest ranked: ${worst.model} (${worst.passRatePct}% · ${round((worst.avgTotalMs || 0) / 1000, 1)}s). Compare pass rate first, then avgTotalMs / tokens.`,
      });
    } else {
      insights.push({
        tone: 'info',
        title: 'Multi-model run',
        detail: `Compare models on schemaPassRate first, then avgTotalMs / tokens (Artificial Analysis style quality×efficiency).`,
      });
    }
  }

  if (summary.avgTtftMs != null && summary.avgTotalMs != null && summary.avgTtftMs > 0) {
    const ttftShare = summary.avgTtftMs / summary.avgTotalMs;
    if (ttftShare < 0.2) {
      insights.push({
        tone: 'neutral',
        title: 'Cost dominated by generation length',
        detail: `TTFT is ~${Math.round(ttftShare * 100)}% of total — optimize schema size / completion tokens more than first-token latency.`,
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
  const n = results.length;
  const blockFound = results.filter((r) => r.isSchemaJsonBlockFound).length;
  const validJson = results.filter((r) => r.isSchemaJsonValidJson).length;
  const protocolOk = results.filter((r) => r.isSchemaJsonValidAgainstProtocol).length;
  const streamOk = results.filter((r) => !r.errorMessage).length;
  const scenarioFullPass = scenarioRows.filter((s) => (s.schemaPassRate ?? 0) >= 1).length;
  const scenarioFullPassRate = scenarioRows.length ? scenarioFullPass / scenarioRows.length : 0;
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
  const avgTokens = n ? round(summary.totalTokens / n, 0) : null;

  const protocolRate = n ? protocolOk / n : 0;
  const streamOkRate = n ? streamOk / n : 0;
  // Cross-scenario full-pass + stream health; when repeat≥3, also factor repeat CV (lower better).
  let stabilityScore = streamOkRate * 0.35 + scenarioFullPassRate * 0.65;
  if (avgTotalCvRepeat != null) {
    const cvPenalty = Math.min(1, avgTotalCvRepeat);
    stabilityScore = stabilityScore * 0.7 + (1 - cvPenalty) * 0.3;
  }

  return {
    protocol: {
      id: 'protocol',
      label: '协议合规',
      tone: protocolRate >= 1 ? 'success' : protocolRate >= 0.85 ? 'warning' : 'danger',
      headline: n ? `${protocolOk}/${n}` : '—',
      sub: n ? `${Math.round(protocolRate * 100)}% protocol` : '—',
      detail: `block ${blockFound}/${n || 0} · json ${validJson}/${n || 0} · protocol ${protocolOk}/${n || 0}`,
      blockFoundRate: n ? round(blockFound / n, 4) : 0,
      validJsonRate: n ? round(validJson / n, 4) : 0,
      protocolRate: round(protocolRate, 4),
    },
    stability: {
      id: 'stability',
      label: '生成稳定性',
      tone:
        stabilityScore >= 0.95 ? 'success' : stabilityScore >= 0.8 ? 'warning' : 'danger',
      headline: `${Math.round(scenarioFullPassRate * 100)}%`,
      sub: '场景满通',
      detail: hasRepeatVolatility
        ? `stream 正常 ${streamOk}/${n} · 场景满通 ${scenarioFullPass}/${scenarioRows.length} · repeat 波动 CV≈${avgTotalCvRepeat ?? '—'}`
        : `stream 正常 ${streamOk}/${n} · 场景满通 ${scenarioFullPass}/${scenarioRows.length}${
            (config?.repeat ?? 1) < 3 ? ' · repeat<3 无组内波动' : ''
          }${latencyCv != null ? ` · 跨场景 latency CV ${latencyCv}` : ''}`,
      streamOkRate: round(streamOkRate, 4),
      scenarioFullPassRate: round(scenarioFullPassRate, 4),
      latencyCvAcrossScenarios: latencyCv,
      repeatLatencyCv: avgTotalCvRepeat,
      hasRepeatVolatility,
    },
    performance: {
      id: 'performance',
      label: '性能',
      tone: 'info',
      headline: summary.avgTotalMs == null ? '—' : `${round(summary.avgTotalMs / 1000, 1)}s`,
      sub: 'avg total',
      detail: `TTFT ${summary.avgTtftMs ?? '—'}ms · firstObs ${summary.avgFirstObsMs ?? '—'}ms · TPOT ${summary.avgTpotMs ?? '—'} ms/tok`,
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
      sub: 'avg tokens / run',
      detail: `合计 ${summary.totalTokens ?? 0} · wall ${summary.benchmarkTotalMs ?? '—'}ms`,
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
        : `avg ${summary.avgJudgeScore ?? '—'} · scored ${judgeScores.length}/${n}${
            judgeErrors ? ` · errors ${judgeErrors}` : ''
          }`,
      enabled: judgeEnabled,
      avgJudgeScore: summary.avgJudgeScore,
      scored: judgeScores.length,
      judgeErrors,
    },
  };
}

export function prepare(report, reportPath) {
  const results = Array.isArray(report.results) ? report.results : [];
  const models = [
    ...new Set(
      (report.models?.length ? report.models : results.map((r) => r.model)).filter(Boolean),
    ),
  ];

  const pass = results.filter((r) => r.isSchemaJsonValidAgainstProtocol).length;
  const fail = results.length - pass;

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
        schemaPassRate: group.filter((g) => g.isSchemaJsonValidAgainstProtocol).length / group.length,
        avgTtftMs: round(avg(group.map((g) => g.ttftMs)), 0),
        avgTotalMs: round(avg(group.map((g) => g.totalMs)), 0),
        avgTpotMs: round(avg(group.map((g) => g.tpotMs)), 2),
        avgFirstObsMs: round(avg(group.map((g) => g.firstObservableComponentMs)), 0),
        avgTotalTokens: round(avg(group.map((g) => g.totalTokens)), 0),
      });
    }
  }

  const failures = results
    .filter((r) => !r.isSchemaJsonValidAgainstProtocol || r.errorMessage)
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
    passRate: results.length ? round(pass / results.length, 4) : 0,
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
    const runs = modelResults.length;
    const pass = modelResults.filter((r) => r.isSchemaJsonValidAgainstProtocol).length;
    const judgeScores = modelResults
      .map((r) => r.llmJudgeScore)
      .filter((s) => typeof s === 'number' && Number.isFinite(s));
    return {
      model,
      runs,
      pass,
      passRatePct: runs ? round((pass / runs) * 100, 0) : 0,
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
