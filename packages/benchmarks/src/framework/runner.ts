import { execFileSync } from 'node:child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { printBenchmarkJson } from './reporter';
import type {
  BenchmarkExcelDetailRow,
  LlmBenchmarkResultItem,
  LlmBenchmarkRunOptions,
  LlmBenchmarkSample,
} from './types';
import {
  buildBenchmarkExcelDetailRows,
  comparisonScenarioLabel,
  resolvePrimaryBenchmarkModelId,
  resolveSamplesDir,
  sampleStdev,
} from '../utils';

/** repeat ≥ 3 且该场景×模型下 n ≥ 3 时写入：与均值同量纲的样本标准差（波动）。 */
export interface BenchmarkComparisonVolatility {
  ttftMsStdev?: number;
  firstObservableComponentMsStdev?: number;
  totalMsStdev: number;
  /** 至少 3 个有效 TPOT 的 run 才有 */
  tpotMsStdev?: number;
  totalTokensStdev: number;
}

export interface BenchmarkComparisonRow {
  scenario: string;
  byModel: Record<
    string,
    {
      runs: number;
      avgTtftMs?: number;
      /** 首个 TinyCard 节点出现耗时（ms）均值 */
      avgFirstObservableComponentMs?: number;
      avgTotalMs: number;
      /** 有 TPOT 的 run 上取均值；全无则为 undefined */
      avgTpotMs?: number;
      avgTotalTokens: number;
      schemaPassRate: number;
      /** 配置 repeat ≥ 3 且本组 runs ≥ 3 时附带 */
      volatility?: BenchmarkComparisonVolatility;
    }
  >;
}

/**
 * 过滤掉缺省值与非有限数，仅保留可参与统计的数值序列。
 * @param values 可能包含 undefined / NaN / Infinity 的原始序列
 * @returns 仅包含有限 number 的新数组
 */
function numberSeries(values: Array<number | undefined>) {
  return values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
}

/**
 * 计算算术平均值；空数组返回 undefined，表示无有效样本。
 * @param values 已清洗后的数值数组
 * @returns 平均值；当样本为空时返回 undefined
 */
function average(values: number[]) {
  if (values.length === 0) return undefined;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * 从结果集中提取出现过的模型列表（去重后排序）。
 * @param results 报告结果列表
 * @returns 去重并排序后的模型列表
 */
function distinctModels(results: LlmBenchmarkResultItem[]): string[] {
  return [...new Set(results.map((r) => r.model).filter(Boolean))].sort() as string[];
}

/**
 * 按场景 + 模型聚合多次 repeat，便于多模型对比。
 * @param results 报告结果列表
 * @param reportOptions 若 `repeat ≥ 3`，对 runs ≥ 3 的分组补充 `volatility`（样本标准差）。
 * @returns 按场景分组后的对比行数据
 */
export function buildComparisonByScenario(
  results: LlmBenchmarkResultItem[],
  reportOptions?: { repeat?: number },
): BenchmarkComparisonRow[] {
  const repeatCfg = reportOptions?.repeat ?? 1;
  const includeVolatility = repeatCfg >= 3;
  const scenarios = [...new Set(results.map(comparisonScenarioLabel))].sort();
  return scenarios.map((scenario) => {
    const rows = results.filter((r) => comparisonScenarioLabel(r) === scenario);
    const models = [...new Set(rows.map((r) => r.model).filter(Boolean))] as string[];
    const byModel: BenchmarkComparisonRow['byModel'] = {};
    for (const m of models) {
      const mr = rows.filter((r) => r.model === m);
      const n = mr.length;
      if (n === 0) continue;
      const tpotValues = mr.map((r) => r.tpotMs).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      const ttftSeries = numberSeries(mr.map((r) => r.ttftMs));
      const tinyCardSeries = numberSeries(mr.map((r) => r.firstObservableComponentMs));
      const totalSeries = mr.map((r) => r.totalMs);
      const tokenSeries = mr.map((r) => r.totalTokens);

      const tpotStdev = tpotValues.length >= 3 ? sampleStdev(tpotValues) : undefined;
      const ttftStdev = ttftSeries.length >= 3 ? sampleStdev(ttftSeries) : undefined;
      const tinyCardStdev = tinyCardSeries.length >= 3 ? sampleStdev(tinyCardSeries) : undefined;
      const volatility: BenchmarkComparisonVolatility | undefined =
        includeVolatility && n >= 3
          ? {
              ...(ttftStdev != null ? { ttftMsStdev: ttftStdev } : {}),
              ...(tinyCardStdev != null ? { firstObservableComponentMsStdev: tinyCardStdev } : {}),
              totalMsStdev: sampleStdev(totalSeries)!,
              totalTokensStdev: sampleStdev(tokenSeries)!,
              ...(tpotStdev != null ? { tpotMsStdev: tpotStdev } : {}),
            }
          : undefined;

      byModel[m] = {
        runs: n,
        ...(average(ttftSeries) != null ? { avgTtftMs: average(ttftSeries) } : {}),
        ...(average(tinyCardSeries) != null ? { avgFirstObservableComponentMs: average(tinyCardSeries) } : {}),
        avgTotalMs: mr.reduce((s, r) => s + r.totalMs, 0) / n,
        ...(tpotValues.length ? { avgTpotMs: tpotValues.reduce((s, v) => s + v, 0) / tpotValues.length } : {}),
        avgTotalTokens: mr.reduce((s, r) => s + r.totalTokens, 0) / n,
        schemaPassRate: mr.filter((r) => r.isSchemaJsonValidAgainstProtocol).length / n,
        ...(volatility ? { volatility } : {}),
      };
    }
    return { scenario, byModel };
  });
}

/**
 * 计算本次报告输出目录。
 * @param options 运行配置
 * @returns 报告输出目录
 */
function getReportOutputDir(options: LlmBenchmarkRunOptions) {
  if (options.outputDir) {
    return path.resolve(options.outputDir);
  }
  const samplesDir = resolveSamplesDir(options.samplesDir);
  // 按需求：report 输出到本次 runDir 根目录下
  return path.resolve(samplesDir);
}

/** packages/benchmarks 根目录（相对本文件 framework/） */
const benchmarksPackageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const insightsRenderScript = path.join(benchmarksPackageDir, 'scripts', 'render-insights-html.mjs');

/**
 * 将结论页（原 insights.html 布局）写入 htmlPath；数据来自已落盘的 report.json。
 */
function writeInsightsReportHtml(reportJsonPath: string, htmlPath: string) {
  execFileSync(process.execPath, [insightsRenderScript, reportJsonPath, '--out', htmlPath], {
    cwd: benchmarksPackageDir,
    encoding: 'utf-8',
  });
}

/**
 * 写出 `report_<runDir>.xlsx`（`runDir` 为输出目录的文件夹名）：明细表 + 按场景×模型聚合（与 HTML 中 comparison 同源）。
 */
function writeReportXlsx(
  filePath: string,
  excelDetailRows: BenchmarkExcelDetailRow[],
  comparisonByScenario: BenchmarkComparisonRow[],
) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(excelDetailRows), '明细');

  const comparisonRows: Array<Record<string, string | number>> = [];
  for (const row of comparisonByScenario) {
    for (const [model, c] of Object.entries(row.byModel)) {
      const base: Record<string, string | number> = {
        scenario: row.scenario,
        model,
        runs: c.runs,
        avgTtftMs: c.avgTtftMs ?? '',
        avgFirstObservableComponentMs: c.avgFirstObservableComponentMs ?? '',
        avgTotalMs: c.avgTotalMs,
        avgTpotMs: c.avgTpotMs ?? '',
        avgTotalTokens: c.avgTotalTokens,
        schemaPassRate: c.schemaPassRate,
      };
      if (c.volatility) {
        base.ttftMsStdev = c.volatility.ttftMsStdev ?? '';
        base.firstObservableComponentMsStdev = c.volatility.firstObservableComponentMsStdev ?? '';
        base.totalMsStdev = c.volatility.totalMsStdev;
        base.tpotMsStdev = c.volatility.tpotMsStdev ?? '';
        base.totalTokensStdev = c.volatility.totalTokensStdev;
      }
      comparisonRows.push(base);
    }
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(comparisonRows), '按场景对比');

  XLSX.writeFile(wb, filePath);
}

/**
 * 将 JSON/HTML 报告写入磁盘到当前 run 输出目录。
 */
function writeBenchmarkArtifacts(
  results: LlmBenchmarkResultItem[],
  options: LlmBenchmarkRunOptions,
  samplesForExcel?: LlmBenchmarkSample[],
) {
  const outputDir = getReportOutputDir(options);
  fs.mkdirSync(outputDir, { recursive: true });

  const modelList = distinctModels(results);
  const comparisonByScenario = buildComparisonByScenario(results, { repeat: options.repeat });
  const primaryModelId = resolvePrimaryBenchmarkModelId(options);
  const modelsInArtifact = modelList.length > 0 ? modelList : [primaryModelId];
  const benchmarkTotalMs =
    typeof options.benchmarkStartedAtMs === 'number' ? Math.max(0, Date.now() - options.benchmarkStartedAtMs) : undefined;

  const jsonPath = path.resolve(outputDir, 'report.json');
  const htmlPath = path.resolve(outputDir, 'report.html');

  const scenariosInRun = [...new Set(results.map((r) => r.scenario).filter(Boolean))].sort() as string[];
  const promptVariantsInRun = [
    ...new Set(results.map((r) => r.promptVariant ?? 'full').filter(Boolean)),
  ].sort() as string[];

  const json = JSON.stringify(
    {
      model: primaryModelId,
      models: modelsInArtifact,
      repeat: options.repeat ?? 1,
      benchmarkTotalMs,
      llmJudge: options.llmJudge,
      /** 跑测主要配置（供 report.html 配置条展示；旧报告可能缺省） */
      config: {
        runDir: path.basename(path.resolve(outputDir)),
        framework: options.framework ?? 'Vue',
        materialsVariant: options.materialsVariant ?? 'standard',
        models: modelsInArtifact,
        scenarios: scenariosInRun,
        promptVariants: promptVariantsInRun,
        repeat: options.repeat ?? 1,
        concurrency: options.concurrency,
        streamTimeoutMs: options.streamTimeoutMs,
        compareEmptySystem: options.compareEmptySystem === true,
        compareEmptySystemPlainOnly: options.compareEmptySystemPlainOnly === true,
        llmJudgeEnabled: options.llmJudge?.enabled === true,
        llmJudgeModel: options.llmJudge?.model,
      },
      comparisonByScenario,
      generatedAt: new Date().toISOString(),
      results,
    },
    null,
    2,
  );
  fs.writeFileSync(jsonPath, json, 'utf-8');
  // 结论页（原 skill insights.html 同款）；不再依赖 Chart.js CDN / 二次跑 skill
  writeInsightsReportHtml(jsonPath, htmlPath);

  const writeExcel = options.writeExcel !== false;
  let xlsxPath: string | undefined;
  if (writeExcel) {
    const runDirLabel = path.basename(path.resolve(outputDir)) || 'run';
    const xlsxFileName = `report_${runDirLabel}.xlsx`;
    xlsxPath = path.resolve(outputDir, xlsxFileName);
    const excelDetailRows = buildBenchmarkExcelDetailRows(results, samplesForExcel);
    writeReportXlsx(xlsxPath, excelDetailRows, comparisonByScenario);
  }

  if (benchmarkTotalMs != null) {
    console.log(`\nTotal benchmark elapsed: ${benchmarkTotalMs} ms`);
  }
  console.log('\nReport Files');
  console.log(`- JSON: ${jsonPath}`);
  console.log(`- HTML: ${htmlPath}`);
  if (writeExcel && xlsxPath) {
    console.log(`- XLSX: ${xlsxPath}`);
  }
}

/**
 * 落盘报告；明细/汇总以 report.html 为准，默认不再向控制台刷 console.table。
 * `options.json === true`（BENCH_JSON）时仍打印 JSON 结果。
 */
export function printLlmBenchmarkResults(
  results: LlmBenchmarkResultItem[],
  options: LlmBenchmarkRunOptions,
  samplesForExcel?: LlmBenchmarkSample[],
) {
  if (options.json) {
    printBenchmarkJson(results);
  }
  writeBenchmarkArtifacts(results, options, samplesForExcel);
  return results;
}
