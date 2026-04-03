import fs from 'fs';
import { genRootSchema } from '@opentiny/genui-sdk-core';
import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
import type { LlmBenchmarkResultItem, LlmBenchmarkRunOptions, LlmBenchmarkSample } from './framework/index';
import { printLlmBenchmarkResults } from './framework/index';
import { computeTpotMs, extractSchemaJsonBlock, parseJudgeJson, resolveSamplesDir } from './utils';

/**
 * 校验 schemaJson 内容，判断是否存在代码块、JSON 合法、协议合法。
 * @param schemaJsonText 从输出中提取的 `schemaJson` 字符串（可能为 null）
 * @returns 协议/JSON 校验结果三元组
 */
function validateSchemaJson(schemaJsonText: string | null) {
  if (!schemaJsonText) {
    return {
      isSchemaJsonBlockFound: false,
      isSchemaJsonValidJson: false,
      isSchemaJsonValidAgainstProtocol: false,
      schemaValidationError: 'schemaJson code block not found',
    };
  }
  try {
    const parsed = JSON.parse(schemaJsonText);
    const validation = genRootSchema().safeParse(parsed);
    if (validation.success) {
      return {
        isSchemaJsonBlockFound: true,
        isSchemaJsonValidJson: true,
        isSchemaJsonValidAgainstProtocol: true,
      };
    }
    const firstIssue = validation.error.issues[0];
    const path = firstIssue?.path?.length ? firstIssue.path.join('.') : '(root)';
    const message = firstIssue?.message ?? 'schema validation failed';
    return {
      isSchemaJsonBlockFound: true,
      isSchemaJsonValidJson: true,
      isSchemaJsonValidAgainstProtocol: false,
      schemaValidationError: `${path}: ${message}`,
    };
  } catch {
    return {
      isSchemaJsonBlockFound: true,
      isSchemaJsonValidJson: false,
      isSchemaJsonValidAgainstProtocol: false,
      schemaValidationError: 'schemaJson is not valid JSON',
    };
  }
}

type LlmJudgeResult = {
  score?: number;
  reason?: string;
  error?: string;
};

/**
 * 使用 LLM-as-a-Judge 对单条样本做质量评估。
 * @param sample 样本数据
 * @param options 运行配置（读取 Judge 模型）
 * @param apiKey DeepSeek API Key
 * @returns Judge 结果（分数与原因）
 */
async function judgeOneSample(sample: LlmBenchmarkSample, options: LlmBenchmarkRunOptions, apiKey: string): Promise<LlmJudgeResult> {
  const judgeCfg = options.llmJudge;
  const modelId = judgeCfg?.model || options.model;
  const system =
    judgeCfg?.systemPrompt ??
    '你是严格的前端代码评测员。请基于用户需求与模型输出评估“可用性、完整性、准确性”。只返回 JSON：{"score":1-10之间数字,"reason":"一句话原因"}。不要输出其它内容。';
  try {
    const deepseek = createDeepSeek({
      apiKey,
      baseURL: process.env.DEEPSEEK_BASE_URL,
    });
    const stream = streamText({
      model: deepseek(modelId),
      temperature: 0,
      system,
      messages: [
        {
          role: 'user',
          content:
            `请评估以下样本。\n` +
            `【场景】${sample.scenario}\n` +
            `【用户需求】\n${sample.prompt}\n\n` +
            `【模型输出】\n${sample.output}\n`,
        },
      ],
    });
    let output = '';
    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'text-delta' && chunk.text) {
        output += chunk.text;
      }
    }
    const parsed = parseJudgeJson(output);
    if (!parsed || typeof parsed.score !== 'number') {
      return { error: 'Judge output JSON parse failed' };
    }
    const score = Math.min(10, Math.max(1, parsed.score));
    return {
      score,
      reason: parsed.reason,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 将单个样本转为报告结果项。
 * @param sample 由生成阶段写入的样本对象
 * @param judge Judge 结果（可选）
 * @returns 用于汇总/展示的指标结果
 */
function toReportItem(sample: LlmBenchmarkSample, judge?: LlmJudgeResult): LlmBenchmarkResultItem {
  const schemaJsonText = extractSchemaJsonBlock(sample.output);
  const validation = validateSchemaJson(schemaJsonText);
  const tpotMs = computeTpotMs(sample.metrics.ttftMs, sample.metrics.totalMs, sample.metrics.completionTokens);
  return {
    scenario: sample.scenario,
    runIndex: sample.runIndex,
    model: sample.model,
    ttftMs: sample.metrics.ttftMs,
    totalMs: sample.metrics.totalMs,
    ...(tpotMs !== undefined ? { tpotMs } : {}),
    ...validation,
    promptTokens: sample.metrics.promptTokens,
    completionTokens: sample.metrics.completionTokens,
    totalTokens: sample.metrics.totalTokens,
    rawOutputChars: sample.metrics.rawOutputChars,
    llmJudgeScore: judge?.score,
    llmJudgeReason: judge?.reason,
    llmJudgeError: judge?.error,
    errorMessage: sample.metrics.errorMessage,
  };
}

/**
 * 读取样本目录并输出统计报告。
 * @param options 运行配置（用于过滤 scenario/scenarios 与 models）
 * @returns 输出打印与写盘后的结果集
 */
export async function runReport(options: LlmBenchmarkRunOptions) {
  const baseDir = resolveSamplesDir(options.samplesDir);
  if (!fs.existsSync(baseDir)) {
    throw new Error(`Samples directory not found: ${baseDir}`);
  }
  const sampleFiles = fs
    .readdirSync(baseDir)
    .filter((name) => name.endsWith('.json') && name !== 'report.json')
    .map((name) => `${baseDir}/${name}`);

  const selectedIds = options.scenarios?.length
    ? new Set(options.scenarios)
    : options.scenario
      ? new Set([options.scenario])
      : undefined;

  const modelSet = options.models?.length ? new Set(options.models) : null;

  const parsedSamples = sampleFiles
    .map((filePath) => JSON.parse(fs.readFileSync(filePath, 'utf-8')) as LlmBenchmarkSample)
    .filter((sample) => !selectedIds || selectedIds.has(sample.scenario))
    .filter((sample) => !modelSet || (sample.model != null && modelSet.has(sample.model)))
    .sort((a, b) => {
      const s = a.scenario.localeCompare(b.scenario);
      if (s !== 0) return s;
      const m = (a.model ?? '').localeCompare(b.model ?? '');
      if (m !== 0) return m;
      return (a.runIndex ?? 1) - (b.runIndex ?? 1);
    });

  const judgeEnabled = options.llmJudge?.enabled === true;
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  const judgeResults: LlmJudgeResult[] = [];
  if (judgeEnabled) {
    if (!apiKey) {
      throw new Error('LLM-as-a-Judge enabled, but DEEPSEEK_API_KEY (or OPENAI_API_KEY fallback) is missing');
    }
    console.log(`[bench][judge] enabled, samples=${parsedSamples.length}`);
    const concurrency = Math.max(1, options.concurrency ?? 2);
    let cursor = 0;
    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= parsedSamples.length) return;
        const sample = parsedSamples[index];
        const judged = await judgeOneSample(sample, options, apiKey);
        judgeResults[index] = judged;
        const score = judged.score == null ? '-' : judged.score.toFixed(2);
        console.log(`[bench][judge] ${index + 1}/${parsedSamples.length} ${sample.scenario} score=${score}${judged.error ? ' error' : ''}`);
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, parsedSamples.length) }, () => worker()));
  }

  const results: LlmBenchmarkResultItem[] = parsedSamples.map((sample, index) => toReportItem(sample, judgeResults[index]));

  if (results.length === 0) {
    throw new Error('No samples matched the current filter');
  }
  const invalidSchemaRows = results.filter((item) => !item.isSchemaJsonValidAgainstProtocol);
  if (invalidSchemaRows.length > 0) {
    console.log('\nSchema Validation Errors (top 5)');
    console.table(
      invalidSchemaRows.slice(0, 5).map((item) => ({
        scenario: item.scenario,
        model: item.model ?? '',
        runIndex: item.runIndex ?? 1,
        schemaError: item.schemaValidationError ?? '',
      })),
    );
  }
  return printLlmBenchmarkResults(results, options);
}
