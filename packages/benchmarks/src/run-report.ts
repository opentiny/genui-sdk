import fs from 'node:fs';
import path from 'node:path';
import { streamText } from 'ai';
import type { LlmBenchmarkResultItem, LlmBenchmarkRunOptions, LlmBenchmarkSample } from './framework/index';
import { printLlmBenchmarkResults } from './framework/index';
import {
  computeTpotMs,
  formatJudgeParseError,
  isJudgeTimeoutError,
  isPlainPromptVariant,
  parseJudgeJson,
  resolveAiSdkModelForBench,
  resolvePrimaryBenchmarkModelId,
  resolveSamplesDir,
  resolveStreamTextUsage,
  benchStreamTextAbortSignal,
} from './utils';
import { protocolFromOptions, validateProtocolOutput } from './protocol';

type LlmJudgeResult = {
  score?: number;
  reason?: string;
  error?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
};

/**
 * 使用 LLM-as-a-Judge 对单条样本做质量评估。
 * 错误信息带前缀便于区分：`judge_timeout` / `judge_empty_output` / `judge_non_json` /
 * `judge_invalid_json` / `judge_missing_score` / `judge_invalid_score` /
 * `judge_stream_error` / `judge_request_failed`。
 */
async function judgeOneSample(sample: LlmBenchmarkSample, options: LlmBenchmarkRunOptions): Promise<LlmJudgeResult> {
  const judgeCfg = options.llmJudge;
  const modelId = judgeCfg?.model || resolvePrimaryBenchmarkModelId(options);
  const protocol = sample.protocol ?? protocolFromOptions(options);
  const system =
    judgeCfg?.systemPrompt ??
    (protocol === 'a2ui'
      ? `你是严格的前端评测员。请依据 A2UI（<a2ui-json> 消息与 Basic Catalog）规范，基于用户需求与模型输出从三个角度评估生成的 UI 是否具备完成目标任务的实际能力，并给出评分：
    1. 完整性:界面元素完整，无缺失或错误组件；
    2. 功能性:交互逻辑正常，按钮表单响应正确；
    3. 信息充分性:提供完成任务所需的全部关键信息。
    只返回 JSON：{"score":1-10之间数字,"reason":"一句话原因"}。不要输出其它内容。`
      : `你是严格的前端代码评测员。请依据 schemaJson 格式规范，基于用户需求与模型输出从三个角度评估生成的UI代码是否具备完成目标任务的实际能力，并给出评分：
    1. 完整性:界面元素完整，无缺失或错误组件；
    2. 功能性:交互逻辑正常，按钮表单响应正确；
    3. 信息充分性:提供完成任务所需的全部关键信息。
    只返回 JSON：{"score":1-10之间数字,"reason":"一句话原因"}。不要输出其它内容。`);
  try {
    const requirementText = sample.messages?.length
      ? sample.messages.map((msg) => `[${msg.role}] ${msg.content}`).join('\n')
      : ((sample as LlmBenchmarkSample & { prompt?: string }).prompt ?? '');
    const modelInstance = await resolveAiSdkModelForBench(modelId);
    const abortSignal = benchStreamTextAbortSignal(options.streamTimeoutMs);
    const streamResult = streamText({
      model: modelInstance,
      temperature: 0,
      system,
      messages: [
        {
          role: 'user',
          content:
            `请评估以下样本。\n` +
            `【场景】${sample.scenario}\n` +
            `【用户需求】\n${requirementText}\n\n` +
            `【模型输出】\n${sample.output}\n`,
        },
      ],
      ...(abortSignal ? { abortSignal } : {}),
    });
    let output = '';
    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let streamError: unknown;
    for await (const chunk of streamResult.fullStream) {
      if (chunk.type === 'text-delta' && chunk.text) {
        output += chunk.text;
      }
      if (chunk.type === 'finish') {
        const u = chunk.totalUsage;
        promptTokens = u?.inputTokens ?? promptTokens;
        completionTokens = u?.outputTokens ?? completionTokens;
        totalTokens = u?.totalTokens ?? totalTokens;
      }
      if (chunk.type === 'error') {
        streamError = chunk.error;
      }
    }
    const settled = await resolveStreamTextUsage(streamResult);
    if (typeof settled.inputTokens === 'number') {
      promptTokens = settled.inputTokens;
    }
    if (typeof settled.outputTokens === 'number') {
      completionTokens = settled.outputTokens;
    }
    if (typeof settled.totalTokens === 'number') {
      totalTokens = settled.totalTokens;
    }
    const usage = {
      promptTokens,
      completionTokens,
      totalTokens,
    };
    if (streamError != null) {
      const detail = streamError instanceof Error ? streamError.message : String(streamError);
      if (isJudgeTimeoutError(streamError) || isJudgeTimeoutError(detail)) {
        return { error: `judge_timeout: ${detail}`, ...usage };
      }
      return { error: `judge_stream_error: ${detail}`, ...usage };
    }

    const parsed = parseJudgeJson(output);
    if (parsed.ok === false) {
      return { error: formatJudgeParseError(parsed), ...usage };
    }
    return {
      score: parsed.score,
      reason: parsed.reason,
      ...usage,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    if (isJudgeTimeoutError(error) || isJudgeTimeoutError(detail)) {
      return { error: `judge_timeout: ${detail}` };
    }
    return { error: `judge_request_failed: ${detail}` };
  }
}

/**
 * 将单个样本转为报告结果项。
 * @param sample 由生成阶段写入的样本对象
 * @param judge Judge 结果（可选）
 * @param options 运行配置；whiteList 优先按样本上的 framework / materialsVariant 解析
 * @returns 用于汇总/展示的指标结果
 */
function toReportItem(
  sample: LlmBenchmarkSample,
  judge?: LlmJudgeResult,
  options?: LlmBenchmarkRunOptions,
): LlmBenchmarkResultItem {
  const protocol = sample.protocol ?? (options ? protocolFromOptions(options) : 'genui');
  // plain = 空 system 纯文本基线：无协议约束，跳过合规校验（与 Judge 一致）
  const validation = isPlainPromptVariant(sample)
    ? {
        isSchemaJsonBlockFound: false,
        isSchemaJsonValidJson: false,
        isSchemaJsonValidAgainstProtocol: false,
        schemaValidationError: 'skipped_plain',
      }
    : validateProtocolOutput(protocol, sample.output, {
        framework: sample.framework ?? options?.framework ?? 'Vue',
        materialsVariant: sample.materialsVariant ?? options?.materialsVariant ?? 'standard',
      });
  const ttftMs = typeof sample.metrics.ttftMs === 'number' ? sample.metrics.ttftMs : undefined;
  const tpotMs =
    typeof sample.metrics.tpotMs === 'number'
      ? sample.metrics.tpotMs
      : ttftMs == null
        ? undefined
        : computeTpotMs(ttftMs, sample.metrics.totalMs, sample.metrics.completionTokens);
  const judgeTotal = judge?.totalTokens ?? 0;
  const benchTotalTokens = sample.metrics.totalTokens + judgeTotal;
  return {
    scenario: sample.scenario,
    promptVariant: sample.promptVariant ?? 'full',
    runIndex: sample.runIndex,
    model: sample.model,
    ...(ttftMs != null ? { ttftMs } : {}),
    totalMs: sample.metrics.totalMs,
    ...(typeof sample.metrics.firstObservableComponentMs === 'number'
      ? { firstObservableComponentMs: sample.metrics.firstObservableComponentMs }
      : {}),
    ...(tpotMs !== undefined ? { tpotMs } : {}),
    isSchemaJsonBlockFound: validation.isSchemaJsonBlockFound,
    isSchemaJsonValidJson: validation.isSchemaJsonValidJson,
    isSchemaJsonValidAgainstProtocol: validation.isSchemaJsonValidAgainstProtocol,
    ...(validation.schemaValidationError != null ? { schemaValidationError: validation.schemaValidationError } : {}),
    promptTokens: sample.metrics.promptTokens,
    completionTokens: sample.metrics.completionTokens,
    totalTokens: sample.metrics.totalTokens,
    benchTotalTokens,
    rawOutputChars: sample.metrics.rawOutputChars,
    ...(sample.metrics.errorMessage ? { requestFailed: true } : {}),
    ...(typeof sample.metrics.retryCount === 'number' ? { retryCount: sample.metrics.retryCount } : {}),
    ...(typeof sample.metrics.retryWaitMs === 'number' ? { retryWaitMs: sample.metrics.retryWaitMs } : {}),
    ...(sample.metrics.lastRetryReason ? { lastRetryReason: sample.metrics.lastRetryReason } : {}),
    ...(sample.metrics.rateLimited === true ? { rateLimited: true } : {}),
    llmJudgeScore: judge?.score,
    llmJudgeReason: judge?.reason,
    llmJudgeError: judge?.error,
    ...(typeof judge?.promptTokens === 'number' ? { llmJudgePromptTokens: judge.promptTokens } : {}),
    ...(typeof judge?.completionTokens === 'number' ? { llmJudgeCompletionTokens: judge.completionTokens } : {}),
    ...(typeof judge?.totalTokens === 'number' ? { llmJudgeTotalTokens: judge.totalTokens } : {}),
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
  const dirEntries = fs.readdirSync(baseDir, { withFileTypes: true });
  const childRunDirs = dirEntries.filter((entry) => entry.isDirectory() && /^\d{4}-\d{2}-\d{2}_/.test(entry.name));
  const hasTopLevelSamples = dirEntries.some((entry) => entry.isFile() && entry.name.endsWith('.json') && entry.name !== 'report.json');
  if (!hasTopLevelSamples && childRunDirs.length > 0) {
    const latest = childRunDirs.map((entry) => entry.name).sort().at(-1);
    throw new Error(
      `Samples directory appears to be a reports root, not a run directory: ${baseDir}. ` +
        `Pass a concrete run directory such as ${path.join(baseDir, latest ?? '<runDir>')}.`,
    );
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
      const vA = isPlainPromptVariant(a) ? 1 : 0;
      const vB = isPlainPromptVariant(b) ? 1 : 0;
      if (vA !== vB) return vA - vB;
      return (a.runIndex ?? 1) - (b.runIndex ?? 1);
    });

  const mixedDimensions = new Set(
    parsedSamples.map(
      (sample) =>
        `${sample.protocol ?? protocolFromOptions(options)}|${sample.framework ?? options.framework ?? 'Vue'}|${sample.materialsVariant ?? options.materialsVariant ?? 'standard'}`,
    ),
  );
  if (mixedDimensions.size > 1) {
    console.warn(
      `[bench] Multiple protocol/framework/materials dimensions found in one report (${mixedDimensions.size}). ` +
        'Avoid mixing unrelated runs in one directory; aggregate comparisons may be misleading.',
    );
  }

  const judgeEnabled = options.llmJudge?.enabled === true;
  const judgeResults: Array<LlmJudgeResult | undefined> = [];
  if (judgeEnabled) {
    const toJudgeCount = parsedSamples.filter((s) => !isPlainPromptVariant(s)).length;
    console.log(
      `[bench][judge] enabled, samples=${parsedSamples.length}, judgeCalls=${toJudgeCount}（纯文本样本跳过 Judge）`,
    );
    const concurrency = Math.max(1, options.concurrency ?? 2);
    let cursor = 0;
    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= parsedSamples.length) return;
        const sample = parsedSamples[index];
        if (isPlainPromptVariant(sample)) {
          judgeResults[index] = undefined;
          console.log(`[bench][judge] ${index + 1}/${parsedSamples.length} ${sample.scenario} plain — skip Judge`);
          continue;
        }
        const judged = await judgeOneSample(sample, options);
        judgeResults[index] = judged;
        if (judged.error) {
          console.log(
            `[bench][judge] ${index + 1}/${parsedSamples.length} ${sample.scenario} error=${judged.error}`,
          );
        } else {
          const score = judged.score == null ? '-' : judged.score.toFixed(2);
          console.log(`[bench][judge] ${index + 1}/${parsedSamples.length} ${sample.scenario} score=${score}`);
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrency, parsedSamples.length) }, () => worker()));
  }

  const results: LlmBenchmarkResultItem[] = parsedSamples.map((sample, index) =>
    toReportItem(sample, judgeEnabled ? judgeResults[index] : undefined, options),
  );

  if (results.length === 0) {
    throw new Error('No samples matched the current filter');
  }
  const protocolRows = results.filter((item) => !isPlainPromptVariant(item) && item.requestFailed !== true);
  const invalidSchemaRows = protocolRows.filter((item) => !item.isSchemaJsonValidAgainstProtocol);
  const failedRequestRows = results.filter((item) => item.requestFailed === true);
  if (failedRequestRows.length > 0) {
    console.log(
      `[bench] Request failed rows: ${failedRequestRows.length}/${results.length}（保留在明细中；聚合性能与协议通过率默认排除）`,
    );
  }
  if (invalidSchemaRows.length > 0) {
    console.log(
      `[bench] Schema validation failed: ${invalidSchemaRows.length}/${protocolRows.length}（详见 report.html；plain 已跳过协议校验）`,
    );
  }
  return await printLlmBenchmarkResults(results, options, parsedSamples);
}
