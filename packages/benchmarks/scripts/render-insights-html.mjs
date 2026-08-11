#!/usr/bin/env node
/**
 * Write self-contained report.html (config strip + HELM-style visualizations).
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
  if (arr.length <= 4) return arr.join(', ');
  return `${arr.slice(0, 3).join(', ')} +${arr.length - 3}`;
}

function passTone(rate) {
  if (rate >= 1) return 'success';
  if (rate >= 0.85) return 'warning';
  return 'danger';
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

  const rows = [
    ['Run', config.runDir],
    ['Framework', config.framework ?? '—'],
    ['Materials', config.materialsVariant ?? '—'],
    ['Models', fmtList(config.models)],
    ['Scenarios', fmtList(config.scenarios)],
    ['Prompt', promptLabel],
    ['Repeat', config.repeat],
    ['Concurrency', config.concurrency ?? '—'],
    ['Stream timeout', timeout],
    ['LLM Judge', judge],
  ];

  return rows
    .map(
      ([k, v]) => `<div class="cfg-item"><dt>${esc(k)}</dt><dd title="${esc(v)}">${esc(v)}</dd></div>`,
    )
    .join('\n');
}

function renderHtml(data) {
  const { source, summary, chart, scenarios, failures, insights, config } = data;
  const passPct = Math.round(summary.passRate * 100);
  const tone = passTone(summary.passRate);
  const multiModel = (source.models?.length || 0) > 1;
  const primary = source.model;
  const generated = source.generatedAt ?? '—';
  const cfg = config || {};

  const verdictTitle =
    summary.passRate >= 1
      ? 'Schema protocol gate passed'
      : summary.passRate >= 0.85
        ? 'Near-pass — protocol regressions remain'
        : 'Schema protocol gate failing';
  const verdictBody =
    summary.fail === 0
      ? `All ${summary.runs} runs passed genRootSchema. Charts below are efficiency context — not a blended score.`
      : `${summary.pass}/${summary.runs} runs passed (${passPct}%). Fix failing scenarios before optimizing latency or tokens.`;

  const showModelCol = multiModel || scenarios.some((s) => s.model && s.model !== primary);
  const scenarioRows = scenarios
    .map((s) => {
      const failed = s.schemaPassRate < 1;
      return `<tr class="${failed ? 'row-fail' : 'row-ok'}">
  <td>${esc(s.scenario)}</td>
  ${showModelCol ? `<td>${esc(s.model)}</td>` : ''}
  <td class="num">${Math.round(s.schemaPassRate * 100)}%</td>
  <td class="num">${esc(fmtMs(s.avgTtftMs))}</td>
  <td class="num">${esc(fmtMs(s.avgFirstObsMs))}</td>
  <td class="num">${esc(fmtMs(s.avgTotalMs))}</td>
  <td class="num">${s.avgTpotMs == null ? '—' : esc(String(s.avgTpotMs))}</td>
  <td class="num">${esc(fmtTokens(s.avgTotalTokens))}</td>
</tr>`;
    })
    .join('\n');

  const failureSection =
    failures.length === 0
      ? ''
      : `<section>
  <h2>Failures</h2>
  <p class="caption">${failures.length} run(s) failed schema protocol or recorded an error.</p>
  <table>
    <thead><tr><th>Scenario</th><th>Model</th><th>Variant</th><th>Error</th></tr></thead>
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
</section>`;

  const insightBlocks = (insights || [])
    .slice(0, 4)
    .map(
      (ins) => `<div class="callout ${esc(ins.tone)}">
  <div class="callout-title">${esc(ins.title)}</div>
  <div class="callout-body">${esc(ins.detail)}</div>
</div>`,
    )
    .join('\n');

  const firstObsVals = (chart.firstObsSec || []).map((v) => (v == null ? 0 : v));
  const stack = chart.latencyStack || [];

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
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font: 16px/1.5 var(--font);
      background:
        radial-gradient(900px 420px at 8% -8%, rgba(61, 214, 198, 0.07), transparent 55%),
        var(--bg);
      color: var(--text);
    }
    main { max-width: 1120px; margin: 0 auto; padding: 28px 20px 72px; }
    header.hero { margin-bottom: 18px; }
    h1 {
      font-size: clamp(1.5rem, 2.6vw, 2rem);
      font-weight: 650;
      margin: 0 0 6px;
      letter-spacing: -0.03em;
    }
    h1 span { color: var(--accent); }
    .lede { margin: 0; color: var(--muted); font-size: 1rem; max-width: 70ch; }
    h2 { font-size: 1.15rem; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.01em; }
    section { margin-top: 26px; }
    .caption { color: var(--muted); font-size: 14px; margin: -2px 0 12px; }

    .cfg {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px 12px;
      padding: 14px 16px;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 10px;
    }
    @media (max-width: 900px) { .cfg { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
    .cfg-item { min-width: 0; }
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
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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

    .kpis {
      display: grid;
      grid-template-columns: repeat(6, minmax(0, 1fr));
      gap: 10px;
    }
    @media (max-width: 900px) { .kpis { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
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
    .panel h3 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: var(--text); }
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
    .hbar-value {
      font-size: 13px;
      text-align: right;
      font-variant-numeric: tabular-nums;
      color: var(--text);
      font-family: var(--mono);
    }
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
    tr:last-child td { border-bottom: none; }
    td.num { text-align: right; font-variant-numeric: tabular-nums; font-family: var(--mono); font-size: 13px; }
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
<main>
  <header class="hero">
    <h1>GenUI Bench <span>Report</span></h1>
    <p class="lede">Schema protocol is the primary gate. Latency and tokens are efficiency context. Generated ${esc(generated)}${multiModel ? ` · charts for primary model ${esc(primary)}` : ''}.</p>
  </header>

  <section aria-label="Run configuration">
    <h2>Configuration</h2>
    <p class="caption">Major run settings captured in report.json (reproducibility / HELM-style transparency).</p>
    <dl class="cfg">
      ${configRows(cfg)}
    </dl>
  </section>

  <section>
    <div class="callout ${esc(tone)}">
      <div class="callout-title">${esc(verdictTitle)}</div>
      <div class="callout-body">${esc(verdictBody)}</div>
    </div>
    <div class="kpis">
      <div class="kpi ${esc(tone)}">
        <div class="label">Schema pass</div>
        <div class="value">${summary.pass}/${summary.runs}</div>
        <div class="sub">${passPct}%</div>
      </div>
      <div class="kpi">
        <div class="label">Avg TTFT</div>
        <div class="value">${esc(fmtMs(summary.avgTtftMs))}</div>
        <div class="sub">first token</div>
      </div>
      <div class="kpi">
        <div class="label">Avg firstObs</div>
        <div class="value">${esc(fmtMs(summary.avgFirstObsMs))}</div>
        <div class="sub">wrapper node</div>
      </div>
      <div class="kpi">
        <div class="label">Avg total</div>
        <div class="value">${esc(fmtMs(summary.avgTotalMs))}</div>
        <div class="sub">end-to-end</div>
      </div>
      <div class="kpi">
        <div class="label">Avg TPOT</div>
        <div class="value">${summary.avgTpotMs == null ? '—' : esc(String(summary.avgTpotMs))}</div>
        <div class="sub">ms / token</div>
      </div>
      <div class="kpi">
        <div class="label">Tokens / wall</div>
        <div class="value">${esc(fmtTokens(summary.totalTokens))}</div>
        <div class="sub">${esc(fmtMs(summary.benchmarkTotalMs))} wall</div>
      </div>
    </div>
  </section>

  <section>
    <h2>Quality × efficiency</h2>
    <p class="caption">Pass rate and latency are shown separately (Artificial Analysis style) — never blended into one score.${multiModel ? ` Bars use primary model «${esc(primary)}»; full grid includes all models.` : ''}</p>
    <div class="charts">
      <div class="panel">
        <h3>Schema pass rate by scenario (%)</h3>
        ${hbarRows([...chart.categories], [...chart.passRatePct], 100, '%', 'pass')}
      </div>
      <div class="panel">
        <h3>End-to-end latency by scenario (s)</h3>
        ${hbarRows([...chart.categories], [...chart.totalSec], Math.max(...(chart.totalSec || [1]), 1), 's', 'lat')}
      </div>
      <div class="panel">
        <h3>TTFT by scenario (s)</h3>
        ${hbarRows([...chart.categories], [...chart.ttftSec], Math.max(...(chart.ttftSec || [1]), 0.01), 's', 'ttft')}
      </div>
      <div class="panel">
        <h3>Tokens by scenario (k)</h3>
        ${hbarRows([...chart.categories], [...chart.tokensK], Math.max(...(chart.tokensK || [1]), 0.1), 'k', 'tok')}
      </div>
      <div class="panel wide">
        <h3>Latency composition (TTFT → firstObs → remainder)</h3>
        <div class="legend">
          <span><i class="l-ttft"></i>TTFT</span>
          <span><i class="l-mid"></i>to firstObs</span>
          <span><i class="l-rest"></i>remainder</span>
          <span>Bar length ∝ total e2e</span>
        </div>
        ${stackRows([...chart.categories], stack)}
      </div>
    </div>
  </section>

  <section>
    <h2>Scenario × metrics</h2>
    <p class="caption">HELM-style grid: quality (pass) plus efficiency. Means over repeat=${esc(cfg.repeat ?? source.repeat)}.</p>
    <table>
      <thead>
        <tr>
          <th>Scenario</th>
          ${showModelCol ? '<th>Model</th>' : ''}
          <th class="num">Pass</th>
          <th class="num">TTFT</th>
          <th class="num">FirstObs</th>
          <th class="num">Total</th>
          <th class="num">TPOT</th>
          <th class="num">Tokens</th>
        </tr>
      </thead>
      <tbody>
        ${scenarioRows}
      </tbody>
    </table>
  </section>

  ${
    insightBlocks
      ? `<section>
    <h2>Highlights</h2>
    <p class="caption">Auto-derived from the same numbers — secondary to the charts.</p>
    ${insightBlocks}
  </section>`
      : ''
  }

  ${failureSection}

  <footer>
    Self-contained report.html (no CDN). Primary gate = schema protocol validity · source ${esc(path.basename(path.dirname(source.reportPath)) + '/report.json')}.
  </footer>
</main>
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
