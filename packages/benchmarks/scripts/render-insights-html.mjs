#!/usr/bin/env node
/**
 * Write self-contained report.html (五维 conclusions + HELM-style tables).
 * No CDN. Used by runReport and skill wrappers.
 *
 * Usage:
 *   node render-insights-html.mjs --latest
 *   node render-insights-html.mjs path/to/report.json
 *   node render-insights-html.mjs --latest --open
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { findLatestReport, findRepoRoot, prepare } from './prepare-overview.mjs';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtMs(ms) {
  if (ms == null || !Number.isFinite(ms)) return '—';
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function fmtTokens(n) {
  if (n == null || !Number.isFinite(n)) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}

function fmtList(arr, empty = '—') {
  if (!Array.isArray(arr) || arr.length === 0) return empty;
  return arr.join(', ');
}

function hbarRows(categories, values, maxVal, suffix, barClass) {
  const nums = values.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0));
  const max = Math.max(maxVal, ...nums, 0.0001);
  return categories
    .map((label, i) => {
      const raw = values[i];
      const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
      const pct = v == null ? 0 : Math.max(0, Math.min(100, (v / max) * 100));
      return `<div class="hbar">
  <div class="hbar-label" title="${esc(label)}">${esc(label)}</div>
  <div class="hbar-track"><div class="hbar-fill ${barClass}" style="width:${pct.toFixed(1)}%"></div></div>
  <div class="hbar-value">${v == null ? '—' : esc(String(v))}${v == null ? '' : esc(suffix)}</div>
</div>`;
    })
    .join('\n');
}

/** Multi-series bars (one group per category; one row per series) — model-to-model scenario compare. */
function multiHbarRows(categories, series, maxVal, suffix) {
  const all = series.flatMap((s) =>
    (s.values || []).map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)),
  );
  const max = Math.max(maxVal, ...all, 0.0001);
  return categories
    .map((label, i) => {
      const rows = series
        .map((s, si) => {
          const raw = s.values?.[i];
          const v = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
          const pct = v == null ? 0 : Math.max(0, Math.min(100, (v / max) * 100));
          const tone = s.barClass || `m${si % 5}`;
          return `<div class="dhbar-row"><span class="tag m${si % 5}" title="${esc(s.label)}">${esc(s.short || String(si + 1))}</span><div class="hbar-track"><div class="hbar-fill ${tone}" style="width:${pct.toFixed(1)}%"></div></div><span class="hbar-value">${v == null ? '—' : `${esc(String(v))}${esc(suffix)}`}</span></div>`;
        })
        .join('\n');
      return `<div class="dhbar">
  <div class="dhbar-label" title="${esc(label)}">${esc(label)}</div>
  <div class="dhbar-bars">${rows}</div>
</div>`;
    })
    .join('\n');
}

function shortModel(name) {
  const s = String(name || '');
  if (s.length <= 14) return s;
  const parts = s.split(/[-_/]/).filter(Boolean);
  if (parts.length >= 2) {
    const tail = parts.slice(-2).join('-');
    return tail.length <= 14 ? tail : tail.slice(0, 14);
  }
  return s.slice(0, 14);
}

function stackRows(categories, stacks) {
  const max = Math.max(...stacks.map((s) => s?.total || 0), 1);
  return categories
    .map((label, i) => {
      const s = stacks[i] || { ttft: 0, mid: 0, rest: 0, total: 0 };
      const t = s.total || 0;
      const pTtft = t ? (s.ttft / t) * 100 : 0;
      const pMid = t ? (s.mid / t) * 100 : 0;
      const pRest = t ? (s.rest / t) * 100 : 0;
      const widthPct = Math.max(0, Math.min(100, (t / max) * 100));
      return `<div class="hbar stack-row">
  <div class="hbar-label" title="${esc(label)}">${esc(label)}</div>
  <div class="hbar-track stack-track" style="width:${widthPct.toFixed(1)}%">
    <div class="seg ttft" style="width:${pTtft.toFixed(1)}%" title="TTFT ${esc(fmtMs(s.ttft))}"></div>
    <div class="seg mid" style="width:${pMid.toFixed(1)}%" title="→ firstObs ${esc(fmtMs(s.mid))}"></div>
    <div class="seg rest" style="width:${pRest.toFixed(1)}%" title="remainder ${esc(fmtMs(s.rest))}"></div>
  </div>
  <div class="hbar-value">${esc(fmtMs(t))}</div>
</div>`;
    })
    .join('\n');
}

function configRows(config) {
  const timeout =
    config.streamTimeoutMs == null
      ? '—'
      : config.streamTimeoutMs === 0
        ? 'unlimited'
        : fmtMs(config.streamTimeoutMs);
  const promptMode = config.compareEmptySystemPlainOnly
    ? 'plain only'
    : config.compareEmptySystem
      ? 'full + plain'
      : 'full';
  const variantLabel = fmtList(config.promptVariants, '');
  const promptLabel =
    variantLabel && variantLabel !== 'full' && variantLabel !== promptMode
      ? `${promptMode} · ${variantLabel}`
      : promptMode;
  const judge = config.llmJudgeEnabled
    ? config.llmJudgeModel
      ? `on (${config.llmJudgeModel})`
      : 'on'
    : 'off';

  // 短字段在前；列表类（多值）整行放后，避免省略
  const shortRows = [
    ['Run', config.runDir ?? '—'],
    ['Protocol', config.protocol ?? 'genui'],
    ['Framework', config.framework ?? '—'],
    ['Materials', config.materialsVariant ?? '—'],
    ['Prompt', promptLabel],
    ['Repeat', config.repeat],
    ['Concurrency', config.concurrency ?? '—'],
    ['Stream timeout', timeout],
    ['LLM Judge', judge],
  ];
  const wideRows = [
    ['Models', fmtList(config.models)],
    ['Scenarios', fmtList(config.scenarios)],
  ];

  return [
    ...shortRows.map(
      ([k, v]) =>
        `<div class="cfg-item"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`,
    ),
    ...wideRows.map(
      ([k, v]) =>
        `<div class="cfg-item cfg-wide"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`,
    ),
  ].join('\n');
}

function dimCard(dim, href) {
  if (!dim) return '';
  return `<a class="dim ${esc(dim.tone || 'neutral')}" href="${esc(href)}">
  <div class="dim-label">${esc(dim.label)}</div>
  <div class="dim-value">${esc(dim.headline)}</div>
  <div class="dim-sub">${esc(dim.sub)}</div>
</a>`;
}

function renderHtml(data) {
  const { source, summary, runSummary, runMetadata, chart, scenarios, failures, insights, config, modelCompare, dimensions } =
    data;
  const dims = dimensions || {};
  const multiModel = (source.models?.length || 0) > 1;
  const primary = source.model;
  const cfg = config || {};
  const judgeEnabled = Boolean(
    dims.quality?.enabled || cfg.llmJudgeEnabled || summary.judgeEnabled,
  );
  const pivotCols = judgeEnabled ? 4 : 3;

  const showModelCol = multiModel || scenarios.some((s) => s.model && s.model !== primary);
  const modelOrder = multiModel
    ? (modelCompare?.rows || []).map((r) => r.model).filter(Boolean)
    : [];
  const modelRank = new Map(modelOrder.map((m, i) => [m, i]));
  const sortedScenarios = [...scenarios].sort((a, b) => {
    const sc = String(a.scenario).localeCompare(String(b.scenario));
    if (sc !== 0) return sc;
    return (modelRank.get(a.model) ?? 99) - (modelRank.get(b.model) ?? 99);
  });

  const fmtJudge = (v) => (v == null || !Number.isFinite(v) ? '—' : String(v));
  const shortHash = (v) => {
    const s = String(v || '');
    return s ? s.slice(0, 12) : '—';
  };
  const dist = runSummary?.distributions || {};
  const healthTone = (runSummary?.failedRows || 0) > 0
    ? 'danger'
    : (runSummary?.retryRows || 0) > 0 || (runSummary?.rateLimitedRows || 0) > 0
      ? 'warning'
      : 'success';

  const healthSection = runSummary
    ? `<section id="sec-health">
    <h2>Run Health</h2>
    <p class="caption">先看这组数字：失败、重试和限流会影响报告可信度；主动限速等待不计入模型响应 totalMs。</p>
    <div class="kpis">
      <div class="kpi ${healthTone}">
        <div class="label">Failed</div>
        <div class="value">${esc(String(runSummary.failedRows ?? 0))}</div>
        <div class="sub">${esc(String(runSummary.successfulRows ?? 0))}/${esc(String(runSummary.totalRows ?? summary.runs))} success</div>
      </div>
      <div class="kpi ${(runSummary.retryRows || 0) > 0 ? 'warning' : ''}">
        <div class="label">Retry rows</div>
        <div class="value">${esc(String(runSummary.retryRows ?? 0))}</div>
        <div class="sub">${esc(String(runSummary.totalRetryCount ?? 0))} retries</div>
      </div>
      <div class="kpi ${(runSummary.rateLimitedRows || 0) > 0 ? 'warning' : ''}">
        <div class="label">Rate limited</div>
        <div class="value">${esc(String(runSummary.rateLimitedRows ?? 0))}</div>
        <div class="sub">${esc(fmtMs(runSummary.totalRateLimitQueueWaitMs ?? 0))} queued</div>
      </div>
      <div class="kpi">
        <div class="label">Total median</div>
        <div class="value">${esc(fmtMs(dist.totalMs?.median))}</div>
        <div class="sub">p95 ${esc(fmtMs(dist.totalMs?.p95))}</div>
      </div>
      <div class="kpi">
        <div class="label">First text</div>
        <div class="value">${esc(fmtMs(dist.firstTextMs?.median))}</div>
        <div class="sub">median visible token</div>
      </div>
      <div class="kpi">
        <div class="label">Retry wait</div>
        <div class="value">${esc(fmtMs(runSummary.totalRetryWaitMs ?? 0))}</div>
        <div class="sub">excluded from totalMs</div>
      </div>
    </div>
  </section>`
    : '';

  const metadata = runMetadata || {};
  const hashes = metadata.hashes || {};
  const git = metadata.git || {};
  const reproSection = runMetadata
    ? `<section id="sec-repro">
    <h2>可复现性</h2>
    <p class="caption">用于判断两份报告是否真的可比；hash 不同通常表示 prompt、样本集或物料发生了变化。</p>
    <dl class="cfg">
      <div class="cfg-item"><dt>Commit</dt><dd>${esc(shortHash(git.commit))}${git.dirty ? ' dirty' : ''}</dd></div>
      <div class="cfg-item"><dt>Branch</dt><dd>${esc(git.branch || '—')}</dd></div>
      <div class="cfg-item"><dt>Node</dt><dd>${esc(metadata.node || '—')}</dd></div>
      <div class="cfg-item"><dt>Bench pkg</dt><dd>${esc(metadata.packageVersions?.benchmarks || '—')}</dd></div>
      <div class="cfg-item"><dt>Prompt hash</dt><dd>${esc(shortHash(hashes.prompt))}</dd></div>
      <div class="cfg-item"><dt>Sample hash</dt><dd>${esc(shortHash(hashes.sampleSet))}</dd></div>
      <div class="cfg-item"><dt>Materials hash</dt><dd>${esc(shortHash(hashes.materialsMeta))}</dd></div>
      <div class="cfg-item"><dt>Samples</dt><dd>${esc(String(metadata.sampleManifest?.length ?? '—'))}</dd></div>
    </dl>
  </section>`
    : '';

  const scenarioRows = sortedScenarios
    .map((s) => {
      const failed = s.schemaPassRate < 1;
      return `<tr class="${failed ? 'row-fail' : 'row-ok'}">
  <td>${esc(s.scenario)}</td>
  ${showModelCol ? `<td>${esc(s.model)}</td>` : ''}
  <td class="num">${Math.round(s.schemaPassRate * 100)}%</td>
  <td class="num">${esc(fmtMs(s.medianFirstTextMs ?? s.avgFirstTextMs ?? s.avgTtftMs))}</td>
  <td class="num">${esc(fmtMs(s.medianFirstObsMs ?? s.avgFirstObsMs))}</td>
  <td class="num">${esc(fmtMs(s.medianTotalMs ?? s.avgTotalMs))}</td>
  <td class="num">${esc(fmtMs(s.p95TotalMs))}</td>
  <td class="num">${s.avgTpotMs == null ? '—' : esc(String(s.avgTpotMs))}</td>
  <td class="num">${esc(fmtTokens(s.medianTokens ?? s.avgTotalTokens))}</td>
  <td class="num">${esc(String(s.failedRuns ?? 0))}/${esc(String(s.totalRuns ?? s.runs ?? 0))}</td>
  ${judgeEnabled ? `<td class="num">${esc(fmtJudge(s.avgJudgeScore))}</td>` : ''}
</tr>`;
    })
    .join('\n');

  const mc = modelCompare && multiModel ? modelCompare : null;
  const modelsForCompare = mc?.rows?.map((r) => r.model) || [];

  const modelMetricRows = mc
    ? mc.rows
        .map((r) => {
          const failed = r.passRatePct < 100;
          return `<tr class="${failed ? 'row-fail' : 'row-ok'}">
  <td>${esc(r.model)}</td>
  <td class="num">${r.passRatePct}%</td>
  <td class="num">${esc(fmtMs(r.avgTtftMs))}</td>
  <td class="num">${esc(fmtMs(r.avgFirstObsMs))}</td>
  <td class="num">${esc(fmtMs(r.avgTotalMs))}</td>
  <td class="num">${r.avgTpotMs == null ? '—' : esc(String(r.avgTpotMs))}</td>
  <td class="num">${esc(fmtTokens(r.avgTotalTokens))}</td>
  ${judgeEnabled ? `<td class="num">${esc(fmtJudge(r.avgJudgeScore))}</td>` : ''}
</tr>`;
        })
        .join('\n')
    : '';

  const scenarioNames = [
    ...new Set(sortedScenarios.map((s) => s.scenario).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b));
  const byScenarioModel = new Map(
    sortedScenarios.map((s) => [`${s.scenario}::${s.model}`, s]),
  );

  const pivotHead =
    modelsForCompare.length > 0
      ? `<tr>
  <th rowspan="2">场景</th>
  ${modelsForCompare.map((m) => `<th colspan="${pivotCols}" class="model-group">${esc(m)}</th>`).join('\n')}
</tr>
<tr>
  ${modelsForCompare
    .map(
      () =>
        judgeEnabled
          ? `<th class="num">Pass</th><th class="num">Total</th><th class="num">Tokens</th><th class="num">Judge</th>`
          : `<th class="num">Pass</th><th class="num">Total</th><th class="num">Tokens</th>`,
    )
    .join('\n')}
</tr>`
      : '';

  const emptyPivotCells = judgeEnabled
    ? `<td class="num">—</td><td class="num">—</td><td class="num">—</td><td class="num">—</td>`
    : `<td class="num">—</td><td class="num">—</td><td class="num">—</td>`;

  const pivotBody = scenarioNames
    .map((scenario) => {
      const cells = modelsForCompare
        .map((model) => {
          const s = byScenarioModel.get(`${scenario}::${model}`);
          if (!s) return emptyPivotCells;
          const failed = s.schemaPassRate < 1;
          const base = `<td class="num ${failed ? 'cell-fail' : 'cell-ok'}">${Math.round(s.schemaPassRate * 100)}%</td>
  <td class="num">${esc(fmtMs(s.avgTotalMs))}</td>
  <td class="num">${esc(fmtTokens(s.avgTotalTokens))}</td>`;
          return judgeEnabled
            ? `${base}
  <td class="num">${esc(fmtJudge(s.avgJudgeScore))}</td>`
            : base;
        })
        .join('\n');
      const anyFail = modelsForCompare.some((model) => {
        const s = byScenarioModel.get(`${scenario}::${model}`);
        return s && s.schemaPassRate < 1;
      });
      const allPass =
        modelsForCompare.length > 0 &&
        modelsForCompare.every((model) => {
          const s = byScenarioModel.get(`${scenario}::${model}`);
          return s && s.schemaPassRate >= 1;
        });
      const rowClass = allPass ? 'row-ok' : anyFail ? 'row-fail' : '';
      return `<tr class="${rowClass}">
  <td>${esc(scenario)}</td>
  ${cells}
</tr>`;
    })
    .join('\n');

  const multiPassSeries =
    modelsForCompare.length > 0
      ? modelsForCompare.map((model, i) => ({
          label: model,
          short: shortModel(model),
          barClass: `m${i % 5}`,
          values: scenarioNames.map((sc) => {
            const s = byScenarioModel.get(`${sc}::${model}`);
            return s ? Math.round((s.schemaPassRate || 0) * 100) : 0;
          }),
        }))
      : [];
  const multiTotalSeries =
    modelsForCompare.length > 0
      ? modelsForCompare.map((model, i) => ({
          label: model,
          short: shortModel(model),
          barClass: `m${i % 5}`,
          values: scenarioNames.map((sc) => {
            const s = byScenarioModel.get(`${sc}::${model}`);
            return s?.avgTotalMs != null ? Math.round((s.avgTotalMs / 1000) * 10) / 10 : 0;
          }),
        }))
      : [];
  const multiTokenSeries =
    modelsForCompare.length > 0
      ? modelsForCompare.map((model, i) => ({
          label: model,
          short: shortModel(model),
          barClass: `m${i % 5}`,
          values: scenarioNames.map((sc) => {
            const s = byScenarioModel.get(`${sc}::${model}`);
            return s?.avgTotalTokens != null
              ? Math.round((s.avgTotalTokens / 1000) * 10) / 10
              : 0;
          }),
        }))
      : [];

  const modelOverviewSection = mc
    ? `<section id="sec-models">
    <h2>模型总览</h2>
    <p class="caption">跨模型汇总：优先看协议通过率，再比延迟与 token。${judgeEnabled ? '已启用 Judge，表中含平均分。' : ''}</p>
    <table>
      <thead>
        <tr>
          <th>模型</th>
          <th class="num">Pass</th>
          <th class="num">TTFT</th>
          <th class="num">FirstObs</th>
          <th class="num">Total</th>
          <th class="num">TPOT</th>
          <th class="num">Tokens</th>
          ${judgeEnabled ? '<th class="num">Judge</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${modelMetricRows}
      </tbody>
    </table>
  </section>

  <section>
    <h2>场景 × 模型</h2>
    <p class="caption">同场景横向对比：Pass（协议通过率）· Total（端到端总耗时 totalMs）· Tokens${judgeEnabled ? ' · Judge（1–10）' : ''}。</p>
    <div class="table-scroll">
    <table class="pivot">
      <thead>
        ${pivotHead}
      </thead>
      <tbody>
        ${pivotBody}
      </tbody>
    </table>
    </div>
  </section>`
    : '';

  const failureSection =
    failures.length === 0
      ? ''
      : `<div class="failure-block">
  <h3>失败明细</h3>
  <table>
    <thead><tr><th>场景</th><th>模型</th><th>变体</th><th>错误</th></tr></thead>
    <tbody>
      ${failures
        .map(
          (f) => `<tr class="row-fail">
  <td>${esc(f.scenario)}</td>
  <td>${esc(f.model)}</td>
  <td>${esc(f.promptVariant)}</td>
  <td class="err">${esc(f.error)}</td>
</tr>`,
        )
        .join('\n')}
    </tbody>
  </table>
</div>`;

  const insightBlocks = (insights || [])
    .slice(0, 5)
    .map(
      (ins) => `<div class="callout ${esc(ins.tone)}">
  <div class="callout-title">${esc(ins.title)}</div>
  <div class="callout-body">${esc(ins.detail)}</div>
</div>`,
    )
    .join('\n');

  const stack = chart.latencyStack || [];
  const stab = dims.stability || {};
  const notFullPass = Math.max(0, (stab.scenarioCount || 0) - (stab.scenarioFullPass || 0));
  const latencyCvLabel = stab.hasRepeatVolatility ? '组内耗时 CV' : '场景间耗时 CV';
  const latencyCvValue =
    stab.hasRepeatVolatility
      ? stab.repeatLatencyCv == null
        ? '—'
        : String(stab.repeatLatencyCv)
      : stab.latencyCvAcrossScenarios == null
        ? '—'
        : String(stab.latencyCvAcrossScenarios);
  const latencyCvSub = stab.hasRepeatVolatility
    ? '同场景多次重复：标准差÷均值，越低越稳'
    : (stab.repeat ?? 1) < 3
      ? `repeat=${stab.repeat ?? 1}，此处为场景间离散度`
      : '各场景平均总耗时：标准差÷均值';

  const proto = dims.protocol || {};
  const gate = proto.gate || {};
  const protocolCaption =
    gate.funnelCaption ||
    '下图按场景看协议通过率。上方三格是校验漏斗：抽出协议块 → JSON 可解析 → 协议通过。';
  const protocolKpis = `<div class="kpis kpis-3" style="margin-bottom:12px">
      <div class="kpi">
        <div class="label">${esc(gate.blockLabel || '抽出协议块')}</div>
        <div class="value">${esc(String(proto.blockFound ?? '—'))}/${esc(String(proto.runs ?? '—'))}</div>
        <div class="sub">${esc(gate.blockSub || '输出中的协议围栏 / 标签块')}</div>
      </div>
      <div class="kpi">
        <div class="label">${esc(gate.jsonLabel || 'JSON 可解析')}</div>
        <div class="value">${esc(String(proto.validJson ?? '—'))}/${esc(String(proto.runs ?? '—'))}</div>
        <div class="sub">${esc(gate.jsonSub || '块内容能 parse')}</div>
      </div>
      <div class="kpi ${esc(proto.tone || '')}">
        <div class="label">${esc(gate.passLabel || '协议通过')}</div>
        <div class="value">${esc(String(proto.protocolOk ?? '—'))}/${esc(String(proto.runs ?? '—'))}</div>
        <div class="sub">${esc(gate.passSub || '符合当前协议 schema')}</div>
      </div>
    </div>`;

  const protocolBars = multiModel
    ? `<div class="legend">
          ${modelsForCompare.map((m, i) => `<span><i class="l-m${i % 5}"></i>${esc(m)}</span>`).join('')}
        </div>
        ${multiHbarRows(scenarioNames, multiPassSeries, 100, '%')}`
    : hbarRows([...chart.categories], [...chart.passRatePct], 100, '%', 'pass');

  const performanceBody = multiModel
    ? `<div class="panel wide">
        <h3>端到端总耗时 totalMs（秒）· 按场景</h3>
        <p class="caption" style="margin:0 0 10px">单次生成从发请求到流结束的总耗时（含首 token 与后续生成），不是 TTFT。</p>
        <div class="legend">
          ${modelsForCompare.map((m, i) => `<span><i class="l-m${i % 5}"></i>${esc(m)}</span>`).join('')}
        </div>
        ${multiHbarRows(
          scenarioNames,
          multiTotalSeries,
          Math.max(...multiTotalSeries.flatMap((s) => s.values), 1),
          's',
        )}
      </div>`
    : `<div class="panel">
        <h3>端到端总耗时 totalMs（秒）</h3>
        <p class="caption" style="margin:0 0 10px">单次生成从发请求到流结束的总耗时。</p>
        ${hbarRows([...chart.categories], [...chart.totalSec], Math.max(...(chart.totalSec || [1]), 1), 's', 'lat')}
      </div>
      <div class="panel">
        <h3>耗时构成（TTFT → 首个可观测组件 → 剩余）</h3>
        <div class="legend">
          <span><i class="l-ttft"></i>TTFT</span>
          <span><i class="l-mid"></i>至 firstObs</span>
          <span><i class="l-rest"></i>剩余</span>
          <span>条长 ∝ 端到端总耗时</span>
        </div>
        ${stackRows([...chart.categories], stack)}
      </div>`;

  const costBody = multiModel
    ? `<div class="panel wide">
        <h3>Tokens（千）· 按场景</h3>
        <div class="legend">
          ${modelsForCompare.map((m, i) => `<span><i class="l-m${i % 5}"></i>${esc(m)}</span>`).join('')}
        </div>
        ${multiHbarRows(
          scenarioNames,
          multiTokenSeries,
          Math.max(...multiTokenSeries.flatMap((s) => s.values), 0.1),
          'k',
        )}
      </div>`
    : `<div class="panel wide">
        <h3>Tokens（千）· 按场景</h3>
        ${hbarRows([...chart.categories], [...chart.tokensK], Math.max(...(chart.tokensK || [1]), 0.1), 'k', 'tok')}
      </div>`;

  const qualityDim = dims.quality || {};
  const qualityBody = qualityDim.enabled
    ? `<div class="kpis kpis-3">
      <div class="kpi ${esc(qualityDim.tone || '')}">
        <div class="label">平均 Judge</div>
        <div class="value">${esc(qualityDim.avgJudgeScore == null ? '—' : String(qualityDim.avgJudgeScore))}</div>
        <div class="sub">1–10 分</div>
      </div>
      <div class="kpi">
        <div class="label">已评分</div>
        <div class="value">${esc(String(qualityDim.scored ?? 0))}/${esc(String(summary.runs || 0))}</div>
        <div class="sub">次运行</div>
      </div>
      <div class="kpi ${(qualityDim.judgeErrors || 0) > 0 ? 'danger' : ''}">
        <div class="label">评分失败</div>
        <div class="value">${esc(String(qualityDim.judgeErrors ?? 0))}</div>
        <div class="sub">llmJudgeError</div>
      </div>
    </div>`
    : `<div class="callout neutral">
      <div class="callout-title">Judge 未启用</div>
      <div class="callout-body">${esc(qualityDim.detail || '开启 BENCH_LLM_JUDGE 后显示 1–10 分。协议通过率 ≠ 质量。')}</div>
    </div>`;

  const navItems = [
    ['#sec-config', '配置'],
    ...(runSummary ? [['#sec-health', '健康']] : []),
    ...(runMetadata ? [['#sec-repro', '复现']] : []),
    ['#sec-verdict', '五维总览'],
    ...(multiModel ? [['#sec-models', '模型总览']] : []),
    ['#sec-protocol', '协议合规'],
    ['#sec-stability', '生成稳定性'],
    ['#sec-performance', '性能'],
    ['#sec-cost', '成本'],
    ['#sec-quality', '质量'],
    ['#sec-detail', '明细'],
    ...(insightBlocks ? [['#sec-highlights', '要点']] : []),
  ];
  const sideNav = navItems
    .map(
      ([href, label], i) =>
        `<a class="side-link${i === 0 ? ' is-active' : ''}" href="${href}" data-nav="${href.slice(1)}">${esc(label)}</a>`,
    )
    .join('\n');

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GenUI Bench Report — ${esc(primary)}</title>
  <style>
    :root {
      --bg: #0e1218;
      --panel: #161c24;
      --panel-2: #12171e;
      --text: #e8eef6;
      --muted: #8b9bb0;
      --faint: #5c6b7e;
      --line: #2a3544;
      --success: #3dd68c;
      --warning: #e8a54b;
      --danger: #ef6b6b;
      --info: #5ba4f5;
      --accent: #3dd6c6;
      --seg-ttft: #3dd6c6;
      --seg-mid: #5ba4f5;
      --seg-rest: #3d4a5c;
      --font: "IBM Plex Sans", "PingFang SC", "Noto Sans SC", ui-sans-serif, sans-serif;
      --mono: "IBM Plex Mono", ui-monospace, monospace;
      --side-w: 188px;
    }
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      font: 16px/1.5 var(--font);
      background: var(--bg);
      color: var(--text);
    }
    .layout {
      display: grid;
      grid-template-columns: var(--side-w) minmax(0, 1fr);
      gap: 0;
      min-height: 100vh;
      align-items: start;
    }
    .side-nav {
      position: sticky;
      top: 0;
      align-self: start;
      height: 100vh;
      padding: 20px 12px 24px 16px;
      border-right: 1px solid var(--line);
      background: var(--panel-2);
      overflow-y: auto;
    }
    .side-brand {
      font-size: 12px;
      font-weight: 650;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--faint);
      margin: 0 0 14px 8px;
    }
    .side-brand span { color: var(--accent); }
    .side-link {
      display: block;
      padding: 8px 10px;
      margin-bottom: 2px;
      border-radius: 8px;
      color: var(--muted);
      text-decoration: none;
      font-size: 13px;
      line-height: 1.3;
      border-left: 2px solid transparent;
    }
    .side-link:hover {
      color: var(--text);
      background: rgba(255,255,255,0.03);
    }
    .side-link.is-active {
      color: var(--text);
      background: rgba(61, 214, 198, 0.08);
      border-left-color: var(--accent);
    }
    main.content {
      max-width: 1120px;
      width: 100%;
      margin: 0 auto;
      padding: 28px 28px 72px;
    }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .side-nav {
        position: sticky;
        top: 0;
        z-index: 20;
        height: auto;
        max-height: none;
        padding: 10px 12px;
        border-right: none;
        border-bottom: 1px solid var(--line);
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        align-items: center;
      }
      .side-brand { width: 100%; margin: 0 0 6px 4px; }
      .side-link {
        display: inline-block;
        margin: 0;
        padding: 6px 10px;
        border-left: none;
        border: 1px solid var(--line);
        border-radius: 999px;
        font-size: 12px;
      }
      .side-link.is-active {
        border-color: var(--accent);
        background: rgba(61, 214, 198, 0.12);
      }
      main.content { padding: 20px 16px 56px; }
    }
    header.hero { margin-bottom: 18px; }
    h1 {
      font-size: clamp(1.5rem, 2.6vw, 2rem);
      font-weight: 650;
      margin: 0 0 6px;
      letter-spacing: -0.03em;
    }
    h1 span { color: var(--accent); }
    .lede { margin: 0; color: var(--muted); font-size: 1rem; max-width: 72ch; }
    section[id] { scroll-margin-top: 16px; }
    h2 { font-size: 1.15rem; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.01em; }
    h3 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: var(--text); }
    section { margin-top: 26px; }
    .caption { color: var(--muted); font-size: 14px; margin: -2px 0 12px; }

    .cfg {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 10px 14px;
      padding: 14px 16px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
    }
    @media (max-width: 900px) { .cfg { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .cfg-item { min-width: 0; }
    .cfg-item.cfg-wide { grid-column: 1 / -1; }
    .cfg-item dt {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--faint);
      margin: 0 0 2px;
      font-weight: 600;
    }
    .cfg-item dd {
      margin: 0;
      font-family: var(--mono);
      font-size: 14px;
      color: var(--text);
      word-break: break-word;
    }

    .callout {
      border: 1px solid var(--line);
      background: var(--panel);
      border-radius: 10px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }
    .callout-title { font-weight: 600; margin-bottom: 4px; font-size: 1.05rem; }
    .callout-body { color: var(--muted); font-size: 15px; }
    .callout.success { border-left: 3px solid var(--success); }
    .callout.warning { border-left: 3px solid var(--warning); }
    .callout.danger { border-left: 3px solid var(--danger); }
    .callout.info { border-left: 3px solid var(--info); }
    .callout.neutral { border-left: 3px solid var(--faint); }

    .dims {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    @media (max-width: 900px) { .dims { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
    @media (max-width: 520px) { .dims { grid-template-columns: 1fr; } }
    a.dim {
      display: block;
      text-decoration: none;
      color: inherit;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px 14px;
      min-height: 92px;
      transition: border-color 0.15s ease;
    }
    a.dim:hover { border-color: var(--accent); }
    .dim-label {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-weight: 600;
    }
    .dim-value {
      font-size: 1.45rem;
      font-weight: 650;
      margin-top: 6px;
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
    }
    .dim-sub { margin-top: 4px; font-size: 13px; color: var(--faint); font-family: var(--mono); }
    .dim.success .dim-value { color: var(--success); }
    .dim.warning .dim-value { color: var(--warning); }
    .dim.danger .dim-value { color: var(--danger); }
    .dim.info .dim-value { color: var(--info); }
    .dim.neutral .dim-value { color: var(--muted); }

    .kpis {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 10px;
    }
    .kpis-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    @media (max-width: 900px) {
      .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); }
      .kpis-3 { grid-template-columns: 1fr; }
    }
    @media (max-width: 520px) { .kpis, .charts { grid-template-columns: 1fr; } }
    .kpi {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 12px 14px;
      min-height: 76px;
    }
    .kpi .label { color: var(--muted); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    .kpi .value { font-size: 1.55rem; font-weight: 650; margin-top: 6px; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
    .kpi .sub { margin-top: 4px; font-size: 13px; color: var(--faint); font-family: var(--mono); }
    .kpi.success .value { color: var(--success); }
    .kpi.warning .value { color: var(--warning); }
    .kpi.danger .value { color: var(--danger); }

    .charts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .panel {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 14px 14px 12px;
      min-height: 140px;
    }
    .panel.wide { grid-column: 1 / -1; }
    .legend {
      display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 10px;
      font-size: 13px; color: var(--muted);
    }
    .legend i {
      display: inline-block; width: 10px; height: 10px; border-radius: 2px;
      margin-right: 5px; vertical-align: -1px;
    }
    .legend .l-ttft { background: var(--seg-ttft); }
    .legend .l-mid { background: var(--seg-mid); }
    .legend .l-rest { background: var(--seg-rest); }
    .legend .l-m0 { background: #3dd6c6; }
    .legend .l-m1 { background: #5ba4f5; }
    .legend .l-m2 { background: #e8a54b; }
    .legend .l-m3 { background: #c084fc; }
    .legend .l-m4 { background: #ef6b6b; }

    .hbar {
      display: grid;
      grid-template-columns: minmax(88px, 150px) 1fr 56px;
      gap: 8px;
      align-items: center;
      margin-bottom: 7px;
    }
    .hbar-label {
      font-size: 13px;
      color: var(--muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--mono);
    }
    .hbar-track {
      height: 11px;
      background: #222a35;
      border-radius: 999px;
      overflow: hidden;
    }
    .hbar-fill { height: 100%; border-radius: 999px; }
    .hbar-fill.pass { background: var(--success); }
    .hbar-fill.lat { background: var(--info); }
    .hbar-fill.tok { background: var(--accent); }
    .hbar-fill.ttft { background: var(--seg-ttft); }
    .hbar-fill.m0 { background: #3dd6c6; }
    .hbar-fill.m1 { background: #5ba4f5; }
    .hbar-fill.m2 { background: #e8a54b; }
    .hbar-fill.m3 { background: #c084fc; }
    .hbar-fill.m4 { background: #ef6b6b; }
    .hbar-value {
      font-size: 13px;
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: var(--text);
      font-family: var(--mono);
    }
    .dhbar { margin-bottom: 10px; }
    .dhbar-label {
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 4px;
      font-family: var(--mono);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dhbar-row {
      display: grid;
      grid-template-columns: 72px 1fr 52px;
      gap: 6px;
      align-items: center;
      margin-bottom: 3px;
    }
    .tag {
      font-size: 11px;
      font-weight: 650;
      color: var(--muted);
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--mono);
    }
    .tag.m0 { color: #3dd6c6; }
    .tag.m1 { color: #5ba4f5; }
    .tag.m2 { color: #e8a54b; }
    .tag.m3 { color: #c084fc; }
    .tag.m4 { color: #ef6b6b; }

    .stack-track {
      display: flex;
      height: 12px;
      background: transparent;
      border-radius: 4px;
      overflow: hidden;
      max-width: 100%;
    }
    .stack-track .seg { height: 100%; min-width: 0; }
    .stack-track .seg.ttft { background: var(--seg-ttft); }
    .stack-track .seg.mid { background: var(--seg-mid); }
    .stack-track .seg.rest { background: var(--seg-rest); }

    .failure-block { margin-top: 16px; }
    .table-scroll { overflow-x: auto; border-radius: 10px; border: 1px solid var(--line); }
    .table-scroll table { border: none; border-radius: 0; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
      overflow: hidden;
    }
    th, td {
      padding: 9px 11px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      font-size: 14px;
    }
    th { color: var(--muted); font-weight: 550; background: var(--panel-2); }
    th.model-group {
      text-align: center;
      border-left: 1px solid var(--line);
      font-family: var(--mono);
      font-size: 12px;
      color: var(--text);
    }
    table.pivot th.num,
    table.pivot td.num { border-left: 1px solid var(--line); }
    table.pivot th.model-group:first-of-type,
    table.pivot tbody td:nth-child(2) { border-left: 1px solid var(--line); }
    tr:last-child td { border-bottom: none; }
    th.num, td.num {
      text-align: right;
      font-variant-numeric: tabular-nums;
      font-family: var(--mono);
      font-size: 13px;
    }
    td.cell-ok { color: var(--success); }
    td.cell-fail { color: var(--danger); }
    td.err { color: var(--danger); word-break: break-word; }
    tr.row-fail td:first-child::before,
    tr.row-ok td:first-child::before {
      content: "";
      display: inline-block;
      width: 6px; height: 6px; border-radius: 50%;
      margin-right: 8px; vertical-align: middle;
    }
    tr.row-fail td:first-child::before { background: var(--danger); }
    tr.row-ok td:first-child::before { background: var(--success); }

    footer { margin-top: 36px; color: var(--faint); font-size: 13px; }
  </style>
</head>
<body>
<div class="layout">
  <nav class="side-nav" aria-label="Sections">
    <div class="side-brand">GenUI <span>Bench</span></div>
    ${sideNav}
  </nav>
<main class="content">
  <header class="hero">
    <h1>GenUI Bench <span>Report</span></h1>
  </header>

  <section id="sec-config" aria-label="Run configuration">
    <h2>配置</h2>
    <dl class="cfg">
      ${configRows(cfg)}
    </dl>
  </section>

  ${healthSection}

  ${reproSection}

  <section id="sec-verdict">
    <p class="caption" style="margin-top:0">协议看能不能用；Judge 看好不好；性能和成本分开比，不合成一个总分。</p>
    <div class="dims">
      ${dimCard(dims.protocol, '#sec-protocol')}
      ${dimCard(dims.stability, '#sec-stability')}
      ${dimCard(dims.performance, '#sec-performance')}
      ${dimCard(dims.cost, '#sec-cost')}
      ${dimCard(dims.quality, '#sec-quality')}
    </div>
  </section>

  ${modelOverviewSection}

  <section id="sec-protocol">
    <h2>协议合规</h2>
    <p class="caption">${esc(protocolCaption)}</p>
    ${protocolKpis}
    <div class="charts">
      <div class="panel wide">
        <h3>各场景协议通过率（%）</h3>
        ${protocolBars}
      </div>
    </div>
    ${failureSection}
  </section>

  <section id="sec-stability">
    <h2>生成稳定性</h2>
    <p class="caption">${esc(dims.stability?.detail || '')}</p>
    <div class="kpis kpis-3">
      <div class="kpi ${esc(stab.tone || '')}">
        <div class="label">全部通过</div>
        <div class="value">${esc(stab.headline || '—')}</div>
        <div class="sub">${esc(String(stab.scenarioFullPass ?? '—'))}/${esc(String(stab.scenarioCount ?? '—'))} 个场景×模型组合</div>
      </div>
      <div class="kpi ${notFullPass > 0 ? 'warning' : 'success'}">
        <div class="label">有失败</div>
        <div class="value">${esc(String(notFullPass))}</div>
        <div class="sub">至少一次协议没过的组合</div>
      </div>
      <div class="kpi">
        <div class="label">${esc(latencyCvLabel)}</div>
        <div class="value">${esc(latencyCvValue)}</div>
        <div class="sub">${esc(latencyCvSub)}</div>
      </div>
    </div>
  </section>

  <section id="sec-performance">
    <h2>性能</h2>
    <div class="charts">
      ${performanceBody}
    </div>
  </section>

  <section id="sec-cost">
    <h2>成本</h2>
    <p class="caption">${esc(dims.cost?.detail || '')}</p>
    <div class="charts">
      ${costBody}
    </div>
  </section>

  <section id="sec-quality">
    <h2>质量</h2>
    ${qualityBody}
  </section>

  <section id="sec-detail">
    <h2>场景明细</h2>
    <table>
      <thead>
        <tr>
          <th>场景</th>
          ${showModelCol ? '<th>模型</th>' : ''}
          <th class="num">Pass</th>
          <th class="num">FirstText</th>
          <th class="num">FirstObs</th>
          <th class="num">Total median</th>
          <th class="num">Total p95</th>
          <th class="num">TPOT</th>
          <th class="num">Tokens</th>
          <th class="num">Failed</th>
          ${judgeEnabled ? '<th class="num">Judge</th>' : ''}
        </tr>
      </thead>
      <tbody>
        ${scenarioRows}
      </tbody>
    </table>
  </section>

  ${
    insightBlocks
      ? `<section id="sec-highlights">
    <h2>要点</h2>
    ${insightBlocks}
  </section>`
      : ''
  }

  <footer>
    Self-contained report.html (no CDN). 五维：协议 / 稳定性 / 性能 / 成本 / 质量 · source ${esc(path.basename(path.dirname(source.reportPath)) + '/report.json')}.
  </footer>
</main>
</div>
<script>
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.side-link[data-nav]'));
  if (!links.length) return;
  var ids = links.map(function (a) { return a.getAttribute('data-nav'); });
  var sections = ids
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  function setActive(id) {
    links.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-nav') === id);
    });
  }

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    var offset = 80;
    var current = sections[0] && sections[0].id;
    for (var i = 0; i < sections.length; i++) {
      var top = sections[i].getBoundingClientRect().top + y - offset;
      if (y >= top) current = sections[i].id;
    }
    if (current) setActive(current);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
</script>
</body>
</html>
`;
}

function parseArgs(argv) {
  const args = {
    latest: false,
    open: false,
    repoRoot: undefined,
    reportPath: undefined,
    out: undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--latest') args.latest = true;
    else if (a === '--open') args.open = true;
    else if (a === '--repo-root') args.repoRoot = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (!a.startsWith('-')) args.reportPath = a;
  }
  return args;
}

function openFile(filePath) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  spawn(cmd, [filePath], { detached: true, stdio: 'ignore' }).unref();
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  let reportPath = args.reportPath;
  if (args.latest || !reportPath) {
    const repoRoot =
      args.repoRoot ||
      findRepoRoot(process.cwd()) ||
      findRepoRoot(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..'));
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
  const data = prepare(report, reportPath);
  const outPath = path.resolve(args.out || path.join(path.dirname(reportPath), 'report.html'));
  fs.writeFileSync(outPath, renderHtml(data), 'utf8');
  console.log(outPath);
  if (args.open) openFile(outPath);
}

main();
