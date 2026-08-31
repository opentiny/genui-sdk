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
  countsTowardProtocolGate,
  resolvePrimaryBenchmarkModelId,
  resolveSamplesDir,
  distributionStats,
  sampleStdev,
  buildBenchmarkHealthSummary,
} from '../utils';
import type { DistributionStats } from '../utils';

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
      /** 原始行数；当存在失败请求时大于 runs。 */
      totalRuns?: number;
      /** 失败请求行数；失败请求保留在明细但不计入聚合均值。 */
      failedRuns?: number;
      avgTtftMs?: number;
      avgFirstChunkMs?: number;
      avgFirstTextMs?: number;
      /** 首个 TinyCard 节点出现耗时（ms）均值 */
      avgFirstObservableComponentMs?: number;
      avgTotalMs: number;
      /** 有 TPOT 的 run 上取均值；全无则为 undefined */
      avgTpotMs?: number;
      avgTotalTokens: number;
      schemaPassRate: number;
      distributions?: {
        firstChunkMs?: DistributionStats;
        firstTextMs?: DistributionStats;
        firstObservableComponentMs?: DistributionStats;
        totalMs?: DistributionStats;
        tpotMs?: DistributionStats;
        totalTokens?: DistributionStats;
      };
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

function optionalDistribution(values: number[]) {
  const stats = distributionStats(values);
  return stats;
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
      const successful = mr.filter((r) => r.requestFailed !== true);
      const n = successful.length;
      const totalRuns = mr.length;
      if (n === 0) continue;
      const tpotValues = successful.map((r) => r.tpotMs).filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
      const ttftSeries = numberSeries(successful.map((r) => r.ttftMs));
      const firstChunkSeries = numberSeries(successful.map((r) => r.firstChunkMs ?? r.ttftMs));
      const firstTextSeries = numberSeries(successful.map((r) => r.firstTextMs ?? r.ttftMs));
      const tinyCardSeries = numberSeries(successful.map((r) => r.firstObservableComponentMs));
      const totalSeries = successful.map((r) => r.totalMs);
      const tokenSeries = successful.map((r) => r.totalTokens);
      const avgTtft = average(ttftSeries);
      const avgFirstChunk = average(firstChunkSeries);
      const avgFirstText = average(firstTextSeries);
      const avgTinyCard = average(tinyCardSeries);
      const firstChunkDist = optionalDistribution(firstChunkSeries);
      const firstTextDist = optionalDistribution(firstTextSeries);
      const tinyCardDist = optionalDistribution(tinyCardSeries);
      const totalDist = optionalDistribution(totalSeries);
      const tpotDist = optionalDistribution(tpotValues);
      const tokenDist = optionalDistribution(tokenSeries);
      const distributions = {
        ...(firstChunkDist ? { firstChunkMs: firstChunkDist } : {}),
        ...(firstTextDist ? { firstTextMs: firstTextDist } : {}),
        ...(tinyCardDist ? { firstObservableComponentMs: tinyCardDist } : {}),
        ...(totalDist ? { totalMs: totalDist } : {}),
        ...(tpotDist ? { tpotMs: tpotDist } : {}),
        ...(tokenDist ? { totalTokens: tokenDist } : {}),
      };

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
        ...(totalRuns !== n ? { totalRuns, failedRuns: totalRuns - n } : {}),
        ...(avgTtft != null ? { avgTtftMs: avgTtft } : {}),
        ...(avgFirstChunk != null ? { avgFirstChunkMs: avgFirstChunk } : {}),
        ...(avgFirstText != null ? { avgFirstTextMs: avgFirstText } : {}),
        ...(avgTinyCard != null ? { avgFirstObservableComponentMs: avgTinyCard } : {}),
        avgTotalMs: successful.reduce((s, r) => s + r.totalMs, 0) / n,
        ...(tpotValues.length ? { avgTpotMs: tpotValues.reduce((s, v) => s + v, 0) / tpotValues.length } : {}),
        avgTotalTokens: successful.reduce((s, r) => s + r.totalTokens, 0) / n,
        // plain 不计入协议门禁；整组皆 plain 时视为无协议期望（vacuous 1）
        schemaPassRate: (() => {
          const scored = mr.filter(countsTowardProtocolGate);
          if (scored.length === 0) return 1;
          return scored.filter((r) => r.isSchemaJsonValidAgainstProtocol).length / scored.length;
        })(),
        ...(Object.keys(distributions).length > 0 ? { distributions } : {}),
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
  try {
    execFileSync(process.execPath, [insightsRenderScript, reportJsonPath, '--out', htmlPath], {
      cwd: benchmarksPackageDir,
      encoding: 'utf-8',
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.warn(`[bench] Failed to render report.html; report.json and XLSX remain available: ${detail}`);
  }
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
        totalRuns: c.totalRuns ?? c.runs,
        failedRuns: c.failedRuns ?? 0,
        avgTtftMs: c.avgTtftMs ?? '',
        avgFirstChunkMs: c.avgFirstChunkMs ?? '',
        avgFirstTextMs: c.avgFirstTextMs ?? '',
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
  const runSummary = buildRunSummary(results);
  const healthSummary = buildBenchmarkHealthSummary(results);

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
      runMetadata: options.runMetadata,
      /** 跑测主要配置（供 report.html 配置条展示；旧报告可能缺省） */
      config: {
        runDir: path.basename(path.resolve(outputDir)),
        suite: options.suite,
        protocol: options.protocol ?? 'genui',
        framework: options.framework ?? 'Vue',
        materialsVariant: options.materialsVariant ?? 'standard',
        models: modelsInArtifact,
        scenarios: scenariosInRun,
        promptVariants: promptVariantsInRun,
        repeat: options.repeat ?? 1,
        concurrency: options.concurrency,
        modelRateLimit: options.modelRateLimit,
        retry: options.retry,
        streamTimeoutMs: options.streamTimeoutMs,
        compareEmptySystem: options.compareEmptySystem === true,
        compareEmptySystemPlainOnly: options.compareEmptySystemPlainOnly === true,
        llmJudgeEnabled: options.llmJudge?.enabled === true,
        llmJudgeModel: options.llmJudge?.model,
        failOnProtocol: options.failOnProtocol === true,
      },
      comparisonByScenario,
      runSummary,
      healthSummary,
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

function buildRunSummary(results: LlmBenchmarkResultItem[]) {
  const successful = results.filter((result) => result.requestFailed !== true);
  const retryRows = results.filter((result) => (result.retryCount ?? 0) > 0);
  const rateLimitedRows = results.filter((result) => result.rateLimited === true);
  const firstChunkSeries = successful
    .map((result) => result.firstChunkMs ?? result.ttftMs)
    .filter((value): value is number => typeof value === 'number');
  const firstTextSeries = successful
    .map((result) => result.firstTextMs ?? result.ttftMs)
    .filter((value): value is number => typeof value === 'number');
  const totalSeries = successful.map((result) => result.totalMs);
  const tokenSeries = successful.map((result) => result.totalTokens);
  const firstChunkDist = optionalDistribution(firstChunkSeries);
  const firstTextDist = optionalDistribution(firstTextSeries);
  const totalDist = optionalDistribution(totalSeries);
  const tokenDist = optionalDistribution(tokenSeries);
  return {
    totalRows: results.length,
    successfulRows: successful.length,
    failedRows: results.length - successful.length,
    retryRows: retryRows.length,
    rateLimitedRows: rateLimitedRows.length,
    totalRetryCount: results.reduce((sum, result) => sum + (result.retryCount ?? 0), 0),
    totalRetryWaitMs: results.reduce((sum, result) => sum + (result.retryWaitMs ?? 0), 0),
    totalRateLimitQueueWaitMs: results.reduce((sum, result) => sum + (result.rateLimitQueueWaitMs ?? 0), 0),
    distributions: {
      ...(firstChunkDist ? { firstChunkMs: firstChunkDist } : {}),
      ...(firstTextDist ? { firstTextMs: firstTextDist } : {}),
      ...(totalDist ? { totalMs: totalDist } : {}),
      ...(tokenDist ? { totalTokens: tokenDist } : {}),
    },
  };
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
