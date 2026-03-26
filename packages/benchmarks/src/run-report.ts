import fs from 'fs';
import { genRootSchema } from '@opentiny/genui-sdk-core';
import type { LlmBenchmarkResultItem, LlmBenchmarkRunOptions, LlmBenchmarkSample } from './framework/index';
import { printLlmBenchmarkResults } from './framework/index';
import { extractSchemaJsonBlock } from './utils/extract-schema-json';
import { resolveSamplesDir } from './utils/fs-paths';

/**
 * 校验 schemaJson 内容，判断是否存在代码块、JSON 合法、协议合法。
 */
function validateSchemaJson(schemaJsonText: string | null) {
  if (!schemaJsonText) {
    return {
      isSchemaJsonBlockFound: false,
      isSchemaJsonValidJson: false,
      isSchemaJsonValidAgainstProtocol: false,
    };
  }
  try {
    const parsed = JSON.parse(schemaJsonText);
    const validation = genRootSchema().safeParse(parsed);
    return {
      isSchemaJsonBlockFound: true,
      isSchemaJsonValidJson: true,
      isSchemaJsonValidAgainstProtocol: validation.success,
    };
  } catch {
    return {
      isSchemaJsonBlockFound: true,
      isSchemaJsonValidJson: false,
      isSchemaJsonValidAgainstProtocol: false,
    };
  }
}

/**
 * 将单个样本转为报告结果项。
 */
function toReportItem(sample: LlmBenchmarkSample): LlmBenchmarkResultItem {
  const schemaJsonText = extractSchemaJsonBlock(sample.output);
  const validation = validateSchemaJson(schemaJsonText);
  return {
    scenario: sample.scenario,
    runIndex: sample.runIndex,
    model: sample.model,
    ttftMs: sample.metrics.ttftMs,
    totalMs: sample.metrics.totalMs,
    ...validation,
    promptTokens: sample.metrics.promptTokens,
    completionTokens: sample.metrics.completionTokens,
    totalTokens: sample.metrics.totalTokens,
    rawOutputChars: sample.metrics.rawOutputChars,
    errorMessage: sample.metrics.errorMessage,
  };
}

/**
 * 读取样本目录并输出统计报告。
 */
export async function runReport(options: LlmBenchmarkRunOptions) {
  const baseDir = resolveSamplesDir(options.samplesDir);
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Samples directory not found: ${baseDir}`);
  }
  const sampleFiles = fs
    .readdirSync(baseDir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => `${baseDir}/${name}`);

  const selectedIds = options.scenarios?.length
    ? new Set(options.scenarios)
    : options.scenario
      ? new Set([options.scenario])
      : undefined;

  const modelSet = options.models?.length ? new Set(options.models) : null;

  const results: LlmBenchmarkResultItem[] = sampleFiles
    .map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LlmBenchmarkSample)
    .filter((sample) => !selectedIds || selectedIds.has(sample.scenario))
    .filter((sample) => !modelSet || (sample.model != null && modelSet.has(sample.model)))
    .map(toReportItem);

  if (results.length === 0) {
    throw new Error('No samples matched the current filter');
  }
  return printLlmBenchmarkResults(results, options);
}
