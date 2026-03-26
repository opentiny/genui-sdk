import fs from 'fs';
import path from 'path';
import { printBenchmarkJson, printBenchmarkSummary, printBenchmarkTable } from './reporter';
import type { LlmBenchmarkResultItem, LlmBenchmarkRunOptions } from './types';
import { resolveSamplesDir } from '../utils/fs-paths';

export interface BenchmarkComparisonRow {
  scenario: string;
  byModel: Record<
    string,
    {
      runs: number;
      avgTtftMs: number;
      avgTotalMs: number;
      avgTotalTokens: number;
      schemaPassRate: number;
    }
  >;
}

/**
 * 从结果集中提取出现过的模型列表（去重后排序）。
 */
function distinctModels(results: LlmBenchmarkResultItem[]): string[] {
  return [...new Set(results.map((r) => r.model).filter(Boolean))].sort() as string[];
}

/** 按场景 + 模型聚合多次 repeat，便于多模型对比 */
export function buildComparisonByScenario(results: LlmBenchmarkResultItem[]): BenchmarkComparisonRow[] {
  const scenarios = [...new Set(results.map((r) => r.scenario))].sort();
  return scenarios.map((scenario) => {
    const rows = results.filter((r) => r.scenario === scenario);
    const models = [...new Set(rows.map((r) => r.model).filter(Boolean))] as string[];
    const byModel: BenchmarkComparisonRow['byModel'] = {};
    for (const m of models) {
      const mr = rows.filter((r) => r.model === m);
      const n = mr.length;
      if (n === 0) continue;
      byModel[m] = {
        runs: n,
        avgTtftMs: mr.reduce((s, r) => s + r.ttftMs, 0) / n,
        avgTotalMs: mr.reduce((s, r) => s + r.totalMs, 0) / n,
        avgTotalTokens: mr.reduce((s, r) => s + r.totalTokens, 0) / n,
        schemaPassRate: mr.filter((r) => r.isSchemaJsonValidAgainstProtocol).length / n,
      };
    }
    return { scenario, byModel };
  });
}

/**
 * 计算本次报告输出目录。
 */
function getReportOutputDir(options: LlmBenchmarkRunOptions) {
  if (options.outputDir) {
    return path.resolve(options.outputDir);
  }
  const samplesDir = resolveSamplesDir(options.samplesDir);
  // 按需求：report 输出到本次 runDir 根目录下
  return path.resolve(samplesDir);
}

/**
 * 将 Date 转为北京时间（UTC+8）用于文件名稳定性。
 */
function toBeijingDate(date: Date) {
  // China mainland is UTC+8 without DST; keep it deterministic for filenames.
  return new Date(date.getTime() + 8 * 60 * 60 * 1000);
}

/**
 * 格式化北京时间时间戳（用于报告文件名）。
 * @example 2026-03-25_15-59-10-787
 */
function formatBeijingTimestamp(date: Date) {
  const d = toBeijingDate(date);
  const yyyy = d.getUTCFullYear();
  const MM = String(d.getUTCMonth() + 1).padStart(2, '0');
  const DD = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  const ms = String(d.getUTCMilliseconds()).padStart(3, '0');
  // e.g. 2026-03-25_15-59-10-787
  return `${yyyy}-${MM}-${DD}_${hh}-${mm}-${ss}-${ms}`;
}

/**
 * 生成 HTML 报告字符串（包含对比图表与明细表）。
 */
function createReportHtml(results: LlmBenchmarkResultItem[], options: LlmBenchmarkRunOptions) {
  const comparison = buildComparisonByScenario(results);
  const modelList = distinctModels(results);
  const modelListForChart = modelList.length > 0 ? modelList : [options.model];
  const payload = JSON.stringify(results);
  const comparisonPayload = JSON.stringify(comparison);
  const modelListPayload = JSON.stringify(modelListForChart);
  const modelsDisplay = modelList.length ? modelList.join(', ') : options.model;
  const beijingNow = formatBeijingTimestamp(new Date());

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>GenUI Benchmark Report</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 20px; background: #0b1020; color: #e6ecff; }
    .card { background: #141a2f; border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 1px solid #253053; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(300px, 1fr)); gap: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #253053; padding: 8px; text-align: left; }
    .ok { color: #3ddc97; }
    .bad { color: #ff7a7a; }
    h3 { margin-top: 0; }
    .hint { opacity: 0.85; font-size: 13px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>GenUI LLM Benchmark</h2>
    <div>Models: <b>${modelsDisplay}</b></div>
    <div>Primary config model: <b>${options.model}</b></div>
    <div>Generated at (Beijing): <b>${beijingNow}</b></div>
  </div>
  <div class="card">
    <h3>按场景 · 模型对比（多次 run 取均值）</h3>
    <p class="hint">下图每个分组对应一个场景；同色柱为同一模型在该场景下的平均 TTFT / Total / Schema 校验通过率。</p>
  </div>
  <div class="grid">
    <div class="card"><canvas id="compareTtftChart"></canvas></div>
    <div class="card"><canvas id="compareTotalChart"></canvas></div>
    <div class="card"><canvas id="compareSchemaChart"></canvas></div>
    <div class="card"><canvas id="compareTokensChart"></canvas></div>
  </div>
  <div class="card">
    <h3>单次运行明细（含 model · scenario · run）</h3>
  </div>
  <div class="grid">
    <div class="card"><canvas id="latencyChart"></canvas></div>
    <div class="card"><canvas id="tokenChart"></canvas></div>
    <div class="card"><canvas id="validChart"></canvas></div>
  </div>
  <div class="card">
    <h3>Details</h3>
    <table id="detailTable"></table>
  </div>
  <script>
    const results = ${payload};
    const comparison = ${comparisonPayload};
    const modelList = ${modelListPayload};
    const scenarioLabels = comparison.map(function (c) { return c.scenario; });
    const barOpts = { responsive: true, plugins: { legend: { position: 'bottom' } } };

    function withTitle(baseOpts, titleText) {
      return {
        ...baseOpts,
        plugins: {
          ...baseOpts.plugins,
          title: { display: true, text: titleText },
        },
      };
    }

    function pickScenarioCell(scenario, model) {
      var row = comparison.find(function (c) { return c.scenario === scenario; });
      return row && row.byModel[model];
    }

    new Chart(document.getElementById('compareTtftChart'), {
      type: 'bar',
      data: {
        labels: scenarioLabels,
        datasets: modelList.map(function (m) {
          return {
            label: m,
            data: scenarioLabels.map(function (sc) {
              var cell = pickScenarioCell(sc, m);
              return cell ? cell.avgTtftMs : null;
            }),
          };
        }),
      },
      options: withTitle(barOpts, 'TTFT 平均对比（ms）'),
    });
    new Chart(document.getElementById('compareTotalChart'), {
      type: 'bar',
      data: {
        labels: scenarioLabels,
        datasets: modelList.map(function (m) {
          return {
            label: m,
            data: scenarioLabels.map(function (sc) {
              var cell = pickScenarioCell(sc, m);
              return cell ? cell.avgTotalMs : null;
            }),
          };
        }),
      },
      options: withTitle(barOpts, 'Total 延迟平均对比（ms）'),
    });
    new Chart(document.getElementById('compareSchemaChart'), {
      type: 'bar',
      data: {
        labels: scenarioLabels,
        datasets: modelList.map(function (m) {
          return {
            label: m,
            data: scenarioLabels.map(function (sc) {
              var cell = pickScenarioCell(sc, m);
              return cell ? cell.schemaPassRate : null;
            }),
          };
        }),
      },
      options: withTitle(
        {
          responsive: true,
          plugins: { legend: { position: 'bottom' } },
          scales: { y: { min: 0, max: 1, ticks: { stepSize: 0.25 } } },
        },
        'Schema 通过率（0~1）',
      ),
    });
    new Chart(document.getElementById('compareTokensChart'), {
      type: 'bar',
      data: {
        labels: scenarioLabels,
        datasets: modelList.map(function (m) {
          return {
            label: m,
            data: scenarioLabels.map(function (sc) {
              var cell = pickScenarioCell(sc, m);
              return cell ? cell.avgTotalTokens : null;
            }),
          };
        }),
      },
      options: withTitle(barOpts, 'Total Tokens 平均对比'),
    });

    const labels = results.map(function (r) {
      var m = r.model ? r.model + ' | ' : '';
      var run = r.runIndex && r.runIndex > 1 ? '#' + r.runIndex : '';
      return m + r.scenario + run;
    });
    new Chart(document.getElementById('latencyChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'TTFT(ms)', data: results.map(function (r) { return r.ttftMs; }) },
          { label: 'Total(ms)', data: results.map(function (r) { return r.totalMs; }) },
        ],
      },
      options: withTitle(barOpts, '单次运行：TTFT & Total'),
    });
    new Chart(document.getElementById('tokenChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Prompt Tokens', data: results.map(function (r) { return r.promptTokens; }) },
          { label: 'Completion Tokens', data: results.map(function (r) { return r.completionTokens; }) },
          { label: 'Total Tokens', data: results.map(function (r) { return r.totalTokens; }) },
        ],
      },
      options: withTitle(barOpts, '单次运行：Token 消耗'),
    });
    new Chart(document.getElementById('validChart'), {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Block', data: results.map(function (r) { return r.isSchemaJsonBlockFound ? 1 : 0; }) },
          { label: 'JSON', data: results.map(function (r) { return r.isSchemaJsonValidJson ? 1 : 0; }) },
          { label: 'Schema', data: results.map(function (r) { return r.isSchemaJsonValidAgainstProtocol ? 1 : 0; }) },
        ],
      },
      options: withTitle(
        { scales: { y: { min: 0, max: 1, ticks: { stepSize: 1 } } }, plugins: { legend: { position: 'bottom' } }, responsive: true },
        '单次运行：schemaJson 校验',
      ),
    });
    const headers = ['model', 'scenario', 'runIndex', 'ttftMs', 'totalMs', 'schema', 'tokens', 'error'];
    const rows = results.map(function (r) {
      return [
        r.model || '',
        r.scenario,
        r.runIndex || 1,
        r.ttftMs.toFixed(2),
        r.totalMs.toFixed(2),
        r.isSchemaJsonValidAgainstProtocol ? '<span class="ok">pass</span>' : '<span class="bad">fail</span>',
        r.totalTokens,
        r.errorMessage || '',
      ];
    });
    const table = document.getElementById('detailTable');
    table.innerHTML = '<tr>' + headers.map(function (h) { return '<th>' + h + '</th>'; }).join('') + '</tr>' +
      rows.map(function (row) {
        return '<tr>' + row.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
      }).join('');
  </script>
</body>
</html>`;
}

/**
 * 将 JSON/HTML 报告写入磁盘，并更新 `benchmark-latest.*`。
 */
function writeBenchmarkArtifacts(results: LlmBenchmarkResultItem[], options: LlmBenchmarkRunOptions) {
  const outputDir = getReportOutputDir(options);
  fs.mkdirSync(outputDir, { recursive: true });

  const modelList = distinctModels(results);
  const comparisonByScenario = buildComparisonByScenario(results);
  const modelsInArtifact = modelList.length > 0 ? modelList : [options.model];

  const jsonPath = path.resolve(outputDir, 'report.json');
  const htmlPath = path.resolve(outputDir, 'report.html');

  const json = JSON.stringify(
    {
      model: options.model,
      models: modelsInArtifact,
      comparisonByScenario,
      generatedAt: new Date().toISOString(),
      results,
    },
    null,
    2,
  );
  const html = createReportHtml(results, options);

  fs.writeFileSync(jsonPath, json, 'utf-8');
  fs.writeFileSync(htmlPath, html, 'utf-8');

  console.log('\nReport Files');
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- HTML: ${htmlPath}`);
}

/**
 * 统一输出 benchmark 结果，支持表格与 JSON 两种格式。
 * @param results 结果集（由 samples 解析并聚合得到）
 * @param options 当前运行配置（用于展示/输出目录/过滤等）
 * @returns 输出的结果集
 */
export function printLlmBenchmarkResults(results: LlmBenchmarkResultItem[], options: LlmBenchmarkRunOptions) {
  const modelList = distinctModels(results);
  const label = modelList.length > 0 ? modelList.join(', ') : options.model;
  console.log(`\nModels: ${label}`);

  if (options.json) {
    printBenchmarkJson(results);
  } else {
    printBenchmarkTable(results);
    printBenchmarkSummary(results);
  }
  writeBenchmarkArtifacts(results, options);
  return results;
}
