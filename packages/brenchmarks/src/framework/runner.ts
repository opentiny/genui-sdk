import fs from 'fs';
import path from 'path';
import { printBenchmarkJson, printBenchmarkSummary, printBenchmarkTable } from './reporter';
import type { LlmBenchmarkResultItem, LlmBenchmarkRunOptions } from './types';
import { resolveSamplesDir } from '../utils/fs-paths';

function getReportOutputDir(options: LlmBenchmarkRunOptions) {
  if (options.outputDir) {
    return path.resolve(options.outputDir);
  }
  const samplesDir = resolveSamplesDir(options.samplesDir);
  return path.resolve(samplesDir, 'reports');
}

function createReportHtml(results: LlmBenchmarkResultItem[], options: LlmBenchmarkRunOptions) {
  const payload = JSON.stringify(results);
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
  </style>
</head>
<body>
  <div class="card">
    <h2>GenUI LLM Benchmark</h2>
    <div>Model: <b>${options.model}</b></div>
    <div>Generated at: <b>${new Date().toISOString()}</b></div>
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
    const labels = results.map(r => r.scenario);
    new Chart(document.getElementById('latencyChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'TTFT(ms)', data: results.map(r => r.ttftMs) },
          { label: 'Total(ms)', data: results.map(r => r.totalMs) }
        ]
      }
    });
    new Chart(document.getElementById('tokenChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Prompt Tokens', data: results.map(r => r.promptTokens) },
          { label: 'Completion Tokens', data: results.map(r => r.completionTokens) },
          { label: 'Total Tokens', data: results.map(r => r.totalTokens) }
        ]
      }
    });
    new Chart(document.getElementById('validChart'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Block', data: results.map(r => r.isSchemaJsonBlockFound ? 1 : 0) },
          { label: 'JSON', data: results.map(r => r.isSchemaJsonValidJson ? 1 : 0) },
          { label: 'Schema', data: results.map(r => r.isSchemaJsonValidAgainstProtocol ? 1 : 0) }
        ]
      },
      options: { scales: { y: { min: 0, max: 1, ticks: { stepSize: 1 } } } }
    });
    const headers = ['scenario','ttftMs','totalMs','schema','tokens','error'];
    const rows = results.map(r => [
      r.scenario,
      r.ttftMs.toFixed(2),
      r.totalMs.toFixed(2),
      r.isSchemaJsonValidAgainstProtocol ? '<span class="ok">pass</span>' : '<span class="bad">fail</span>',
      r.totalTokens,
      r.errorMessage || ''
    ]);
    const table = document.getElementById('detailTable');
    table.innerHTML = '<tr>' + headers.map(h => '<th>' + h + '</th>').join('') + '</tr>' +
      rows.map(row => '<tr>' + row.map(c => '<td>' + c + '</td>').join('') + '</tr>').join('');
  </script>
</body>
</html>`;
}

function writeBenchmarkArtifacts(results: LlmBenchmarkResultItem[], options: LlmBenchmarkRunOptions) {
  const outputDir = getReportOutputDir(options);
  fs.mkdirSync(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.resolve(outputDir, `benchmark-${timestamp}.json`);
  const htmlPath = path.resolve(outputDir, `benchmark-${timestamp}.html`);
  const latestJsonPath = path.resolve(outputDir, 'benchmark-latest.json');
  const latestHtmlPath = path.resolve(outputDir, 'benchmark-latest.html');

  const json = JSON.stringify(
    {
      model: options.model,
      generatedAt: new Date().toISOString(),
      results,
    },
    null,
    2,
  );
  const html = createReportHtml(results, options);

  fs.writeFileSync(jsonPath, json, 'utf-8');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  fs.writeFileSync(latestJsonPath, json, 'utf-8');
  fs.writeFileSync(latestHtmlPath, html, 'utf-8');

  console.log('\nReport Files');
  console.log(`- JSON: ${latestJsonPath}`);
  console.log(`- HTML: ${latestHtmlPath}`);
}

/**
 * 统一输出 benchmark 结果，支持表格与 JSON 两种格式。
 */
export function printLlmBenchmarkResults(results: LlmBenchmarkResultItem[], options: LlmBenchmarkRunOptions) {
  console.log(`\nModel: ${options.model}`);

  if (options.json) {
    printBenchmarkJson(results);
  } else {
    printBenchmarkTable(results);
    printBenchmarkSummary(results);
  }
  writeBenchmarkArtifacts(results, options);
  return results;
}
