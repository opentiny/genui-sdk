import fs from 'node:fs';
import { genRootSchema, repairJson, RepairJsonState } from '@opentiny/genui-sdk-core';
import { streamText } from 'ai';
import type { ZodIssue } from 'zod';
import type { LlmBenchmarkResultItem, LlmBenchmarkRunOptions, LlmBenchmarkSample } from './framework/index';
import { printLlmBenchmarkResults } from './framework/index';
import {
  computeTpotMs,
  extractSchemaJsonBlock,
  formatJudgeParseError,
  isJudgeTimeoutError,
  parseJudgeJson,
  resolveAiSdkModelForBench,
  resolveMaterialsMeta,
  resolvePrimaryBenchmarkModelId,
  resolveSamplesDir,
  resolveStreamTextUsage,
  benchStreamTextAbortSignal,
} from './utils';

/**
 * 递归展开 Zod issue，尽量定位到 union 分支内的最深层错误。
 */
function flattenZodIssues(issues: readonly ZodIssue[]): ZodIssue[] {
  const flattened: ZodIssue[] = [];
  for (const issue of issues) {
    if (issue.code === 'invalid_union') {
      const unionErrors = (issue as ZodIssue & { unionErrors?: Array<{ issues: ZodIssue[] }> }).unionErrors ?? [];
      if (unionErrors.length > 0) {
        for (const unionError of unionErrors) {
          flattened.push(...flattenZodIssues(unionError.issues));
        }
        continue;
      }
    }
    flattened.push(issue);
  }
  return flattened;
}

/**
 * 选择最有定位价值的 issue：优先更深路径，其次非泛化报错文案。
 */
function pickMostSpecificIssue(issues: readonly ZodIssue[]): ZodIssue | undefined {
  const expanded = flattenZodIssues(issues);
  if (expanded.length === 0) return undefined;
  return expanded.slice().sort((a, b) => {
    const pathScoreA = a.path.length * 100;
    const pathScoreB = b.path.length * 100;
    const msgScoreA = a.message === 'Invalid input' ? 0 : 10;
    const msgScoreB = b.message === 'Invalid input' ? 0 : 10;
    const codeScoreA = a.code === 'invalid_type' ? 5 : 0;
    const codeScoreB = b.code === 'invalid_type' ? 5 : 0;
    return pathScoreB + msgScoreB + codeScoreB - (pathScoreA + msgScoreA + codeScoreA);
  })[0];
}

type SchemaJsonValidation = {
  isSchemaJsonBlockFound: boolean;
  isSchemaJsonValidJson: boolean;
  isSchemaJsonValidAgainstProtocol: boolean;
  schemaValidationError?: string;
};

/**
 * 校验 schemaJson：PatternExtractor 提取 → repairJson 解析 → genRootSchema(whiteList) 协议。
 */
function validateSchemaJson(schemaJsonText: string | null, componentWhiteList?: string[]): SchemaJsonValidation {
  if (!schemaJsonText) {
    return {
      isSchemaJsonBlockFound: false,
      isSchemaJsonValidJson: false,
      isSchemaJsonValidAgainstProtocol: false,
      schemaValidationError: 'schemaJson code block not found',
    };
  }

  const repaired = repairJson(schemaJsonText);
  if (
    repaired.state === RepairJsonState.INVALID_INPUT ||
    repaired.state === RepairJsonState.FAILED ||
    repaired.value === undefined
  ) {
    return {
      isSchemaJsonBlockFound: true,
      isSchemaJsonValidJson: false,
      isSchemaJsonValidAgainstProtocol: false,
      schemaValidationError: `schema JSON repair/parse failed (state=${repaired.state})`,
    };
  }

  const result = genRootSchema(componentWhiteList).safeParse(repaired.value);
  if (result.success) {
    return {
      isSchemaJsonBlockFound: true,
      isSchemaJsonValidJson: true,
      isSchemaJsonValidAgainstProtocol: true,
    };
  }
  const issue = pickMostSpecificIssue(result.error.issues);
  const path = issue?.path?.length ? issue.path.join('.') : '(root)';
  const message = issue
    ? `[${issue.code}] ${issue.message}`
    : `schema safeParse failed (issues=${result.error.issues.length})`;
  return {
    isSchemaJsonBlockFound: true,
    isSchemaJsonValidJson: true,
    isSchemaJsonValidAgainstProtocol: false,
    schemaValidationError: `${path}: ${message}`,
  };
}

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
  const system =
    judgeCfg?.systemPrompt ??
    `你是严格的前端代码评测员。请依据 schemaJson 格式规范，基于用户需求与模型输出从三个角度评估生成的UI代码是否具备完成目标任务的实际能力，并给出评分：
    1. 完整性:界面元素完整，无缺失或错误组件；
    2. 功能性:交互逻辑正常，按钮表单响应正确；
    3. 信息充分性:提供完成任务所需的全部关键信息。
    只返回 JSON：{"score":1-10之间数字,"reason":"一句话原因"}。不要输出其它内容。`;
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
    const score = Math.min(10, Math.max(1, parsed.score));
    return {
      score,
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
 * @param componentWhiteList materialsMeta.whiteList，传入 genRootSchema
 * @returns 用于汇总/展示的指标结果
 */
function toReportItem(
  sample: LlmBenchmarkSample,
  judge?: LlmJudgeResult,
  componentWhiteList?: string[],
): LlmBenchmarkResultItem {
  const schemaJsonText = extractSchemaJsonBlock(sample.output);
  const validation = validateSchemaJson(schemaJsonText, componentWhiteList);
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
      const vA = (a.promptVariant ?? 'full') === 'plain' ? 1 : 0;
      const vB = (b.promptVariant ?? 'full') === 'plain' ? 1 : 0;
      if (vA !== vB) return vA - vB;
      return (a.runIndex ?? 1) - (b.runIndex ?? 1);
    });

  const judgeEnabled = options.llmJudge?.enabled === true;
  const judgeResults: Array<LlmJudgeResult | undefined> = [];
  const materialsMetaForRun = resolveMaterialsMeta(options.framework ?? 'Vue', options.materialsVariant ?? 'standard');
  const componentWhiteList = materialsMetaForRun.whiteList;
  if (judgeEnabled) {
    const toJudgeCount = parsedSamples.filter((s) => (s.promptVariant ?? 'full') !== 'plain').length;
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
        if ((sample.promptVariant ?? 'full') === 'plain') {
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
    toReportItem(sample, judgeEnabled ? judgeResults[index] : undefined, componentWhiteList),
  );

  if (results.length === 0) {
    throw new Error('No samples matched the current filter');
  }
  const invalidSchemaRows = results.filter((item) => !item.isSchemaJsonValidAgainstProtocol);
  if (invalidSchemaRows.length > 0) {
    console.log(`\nSchema Validation Errors (all ${invalidSchemaRows.length})`);
    console.table(
      invalidSchemaRows.map((item) => ({
        scenario: item.scenario,
        variant: item.promptVariant ?? 'full',
        model: item.model ?? '',
        runIndex: item.runIndex ?? 1,
        schemaError: item.schemaValidationError ?? '',
      })),
    );
  }
  return await printLlmBenchmarkResults(results, options, parsedSamples);
}
