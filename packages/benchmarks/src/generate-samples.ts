import fs from 'node:fs';
import path from 'node:path';
import type { LlmBenchmarkRunOptions, LlmBenchmarkSample, LlmBenchmarkSampleCase } from './framework/index';
import { getLlmBenchmarkSampleCases } from './samples';
import {
  buildSystemPromptForProtocol,
  hasFirstObservableForProtocol,
  protocolFromOptions,
  type BenchProtocol,
} from './protocol';
import {
  formatBeijingRunDirName,
  getSampleFilePath,
  resolveAiSdkModelForBench,
  resolveMaterialsMeta,
  resolveModelsForBench,
  resolveSamplesDir,
  resolveStreamTextUsage,
  benchStreamTextAbortSignal,
  slugifyModelForFilename,
  buildBenchmarkRunMetadata,
} from './utils';
import { computeTpotMs } from './utils';
import { streamText } from 'ai';

type IFrameworkKey = 'Vue' | 'Angular';
type IMaterialsVariant = 'mini' | 'standard';

type RetryConfig = Required<NonNullable<LlmBenchmarkRunOptions['retry']>>;

type SampleAttemptResult = {
  output: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  rawOutputChars: number;
  totalMs: number;
  firstChunkMs?: number;
  firstTextMs?: number;
  ttftMs?: number;
  tpotMs?: number;
  firstObservableComponentMs?: number;
  errorMessage?: string;
};

type RetryMeta = {
  retryCount: number;
  retryWaitMs: number;
  lastRetryReason?: string;
  rateLimited?: boolean;
};

class SlidingWindowRateLimiter {
  private readonly starts: number[] = [];
  private queue = Promise.resolve();

  constructor(
    private readonly requests: number,
    private readonly windowMs: number,
  ) {}

  async waitTurn(): Promise<number> {
    const previous = this.queue;
    let release!: () => void;
    this.queue = new Promise((resolve) => {
      release = resolve;
    });
    await previous;

    try {
      const now = Date.now();
      this.prune(now);
      if (this.starts.length < this.requests) {
        this.starts.push(now);
        return 0;
      }

      const oldest = this.starts[0]!;
      const waitMs = Math.max(0, oldest + this.windowMs - now);
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      const afterWait = Date.now();
      this.prune(afterWait);
      this.starts.push(afterWait);
      return waitMs;
    } finally {
      release();
    }
  }

  private prune(now: number) {
    while (this.starts.length > 0 && now - this.starts[0]! >= this.windowMs) {
      this.starts.shift();
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(message: string) {
  return /\b429\b|rate.?limit|too many requests|quota|throttl/i.test(message);
}

function isRetryableError(message: string) {
  return isRateLimitError(message) || /\b(408|409|425|500|502|503|504)\b|timeout|aborted|ECONNRESET|ETIMEDOUT|EAI_AGAIN/i.test(message);
}

function retryDelayMs(attempt: number, retry: RetryConfig) {
  const exp = retry.baseDelayMs * 2 ** Math.max(0, attempt - 1);
  const capped = Math.min(retry.maxDelayMs, exp);
  const jitter = Math.floor(capped * 0.2 * Math.random());
  return capped + jitter;
}

function resolveRetryConfig(options: LlmBenchmarkRunOptions): RetryConfig {
  return {
    maxAttempts: Math.max(1, options.retry?.maxAttempts ?? 3),
    baseDelayMs: Math.max(1, options.retry?.baseDelayMs ?? 2_000),
    maxDelayMs: Math.max(1, options.retry?.maxDelayMs ?? 30_000),
  };
}

/**
 * 根据 `scenarios` / `scenario` 过滤要生成样本的场景（已按协议选好 contextual 分支）。
 */
function selectSampleCases(cases: LlmBenchmarkSampleCase[], options: LlmBenchmarkRunOptions) {
  const selectedIds = options.scenarios?.length
    ? new Set(options.scenarios)
    : options.scenario
      ? new Set([options.scenario])
      : undefined;
  if (!selectedIds) {
    return cases;
  }
  return cases.filter((item) => selectedIds.has(item.id));
}

/**
 * 为单个场景调用模型并写入样本文件。
 */
async function runSampleAttempt(
  modelInstance: Awaited<ReturnType<typeof resolveAiSdkModelForBench>>,
  sampleCase: LlmBenchmarkSampleCase,
  system: string,
  streamTimeoutMs: number | undefined,
  wrapperComponent: string,
  protocol: BenchProtocol,
): Promise<SampleAttemptResult> {
  const start = Date.now();
  let firstTokenAt = 0;
  let firstTextAt = 0;
  let firstObservableAt = 0;
  let output = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let errorMessage: string | undefined;

  try {
    const abortSignal = benchStreamTextAbortSignal(streamTimeoutMs);
    const streamResult = streamText({
      model: modelInstance,
      temperature: 0,
      system,
      messages: sampleCase.messages,
      ...(abortSignal ? { abortSignal } : {}),
    });

    for await (const chunk of streamResult.fullStream) {
      if (chunk.type === 'text-delta' && chunk.text) {
        if (!firstTokenAt) {
          firstTokenAt = Date.now();
        }
        if (!firstTextAt) {
          firstTextAt = Date.now();
        }
        const before = output;
        output += chunk.text;
        const now = Date.now();
        if (
          !firstObservableAt &&
          hasFirstObservableForProtocol(protocol, output, wrapperComponent) &&
          !hasFirstObservableForProtocol(protocol, before, wrapperComponent)
        ) {
          firstObservableAt = now;
        }
      }
      if (chunk.type === 'finish') {
        const u = chunk.totalUsage;
        promptTokens = u?.inputTokens ?? promptTokens;
        completionTokens = u?.outputTokens ?? completionTokens;
        totalTokens = u?.totalTokens ?? totalTokens;
      }
      if (chunk.type === 'reasoning-delta' && chunk.text) {
        // 仅记录首字节时间，不把推理内容写入最终输出
        if (!firstTokenAt) {
          firstTokenAt = Date.now();
        }
      }
      if (chunk.type === 'error') {
        errorMessage = chunk.error instanceof Error ? chunk.error.message : String(chunk.error);
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
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  const totalMs = Date.now() - start;
  const firstChunkMs = firstTokenAt ? firstTokenAt - start : undefined;
  const firstTextMs = firstTextAt ? firstTextAt - start : undefined;
  const ttftMs = firstChunkMs;
  const tpotMs = firstTextMs == null ? undefined : computeTpotMs(firstTextMs, totalMs, completionTokens);
  const firstObservableComponentMs = firstObservableAt ? firstObservableAt - start : undefined;

  return {
    output,
    ...(firstChunkMs != null ? { firstChunkMs } : {}),
    ...(firstTextMs != null ? { firstTextMs } : {}),
    ...(ttftMs != null ? { ttftMs } : {}),
    totalMs,
    ...(firstObservableComponentMs != null ? { firstObservableComponentMs } : {}),
    ...(tpotMs !== undefined ? { tpotMs } : {}),
    promptTokens,
    completionTokens,
    totalTokens,
    rawOutputChars: output.length,
    errorMessage,
  };
}

async function runSampleAttemptWithRetry(
  modelInstance: Awaited<ReturnType<typeof resolveAiSdkModelForBench>>,
  model: string,
  sampleCase: LlmBenchmarkSampleCase,
  system: string,
  streamTimeoutMs: number | undefined,
  wrapperComponent: string,
  protocol: BenchProtocol,
  retry: RetryConfig,
): Promise<SampleAttemptResult & RetryMeta> {
  let retryWaitMs = 0;
  let lastRetryReason: string | undefined;
  let rateLimited = false;

  for (let attempt = 1; attempt <= retry.maxAttempts; attempt++) {
    const result = await runSampleAttempt(
      modelInstance,
      sampleCase,
      system,
      streamTimeoutMs,
      wrapperComponent,
      protocol,
    );
    if (!result.errorMessage || attempt >= retry.maxAttempts || !isRetryableError(result.errorMessage)) {
      return {
        ...result,
        retryCount: attempt - 1,
        retryWaitMs,
        ...(lastRetryReason ? { lastRetryReason } : {}),
        ...(rateLimited || isRateLimitError(result.errorMessage ?? '') ? { rateLimited: true } : {}),
      };
    }

    lastRetryReason = result.errorMessage;
    rateLimited = rateLimited || isRateLimitError(result.errorMessage);
    const waitMs = retryDelayMs(attempt, retry);
    retryWaitMs += waitMs;
    console.log(
      `[bench][retry] model=${model}, scenario=${sampleCase.id}, attempt=${attempt}/${retry.maxAttempts}, wait=${waitMs}ms, reason=${result.errorMessage}`,
    );
    await sleep(waitMs);
  }

  throw new Error('unreachable retry loop state');
}

/**
 * 为单个场景调用模型并写入样本文件。
 */
async function generateSingleSample(
  modelInstance: Awaited<ReturnType<typeof resolveAiSdkModelForBench>>,
  model: string,
  sampleCase: LlmBenchmarkSampleCase,
  runIndex: number,
  system: string,
  promptVariant: 'full' | 'plain',
  streamTimeoutMs: number | undefined,
  wrapperComponent: string,
  framework: IFrameworkKey,
  materialsVariant: IMaterialsVariant,
  protocol: BenchProtocol,
  retry: RetryConfig,
  rateLimitQueueWaitMs: number,
): Promise<LlmBenchmarkSample> {
  const result = await runSampleAttemptWithRetry(
    modelInstance,
    model,
    sampleCase,
    system,
    streamTimeoutMs,
    wrapperComponent,
    protocol,
    retry,
  );

  return {
    scenario: sampleCase.id,
    promptVariant,
    runIndex,
    model,
    protocol,
    framework,
    materialsVariant,
    messages: sampleCase.messages,
    output: result.output,
    generatedAt: new Date().toISOString(),
    metrics: {
      ...(result.ttftMs != null ? { ttftMs: result.ttftMs } : {}),
      ...(result.firstChunkMs != null ? { firstChunkMs: result.firstChunkMs } : {}),
      ...(result.firstTextMs != null ? { firstTextMs: result.firstTextMs } : {}),
      totalMs: result.totalMs,
      ...(result.firstObservableComponentMs != null
        ? { firstObservableComponentMs: result.firstObservableComponentMs }
        : {}),
      ...(result.tpotMs !== undefined ? { tpotMs: result.tpotMs } : {}),
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      totalTokens: result.totalTokens,
      rawOutputChars: result.rawOutputChars,
      ...(result.errorMessage ? { errorMessage: result.errorMessage } : {}),
      ...(result.retryCount > 0 ? { retryCount: result.retryCount } : {}),
      ...(result.retryWaitMs > 0 ? { retryWaitMs: result.retryWaitMs } : {}),
      ...(rateLimitQueueWaitMs > 0 ? { rateLimitQueueWaitMs } : {}),
      ...(result.lastRetryReason ? { lastRetryReason: result.lastRetryReason } : {}),
      ...(result.rateLimited ? { rateLimited: true } : {}),
    },
  };
}

/**
 * 批量生成样本并落盘。
 */
export async function generateSamples(options: LlmBenchmarkRunOptions) {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
  const protocol = protocolFromOptions(options);
  const framework = options.framework ?? 'Vue';
  const materialsVariant = options.materialsVariant ?? 'standard';
  const materialsMetaForRun = resolveMaterialsMeta(framework, materialsVariant);
  const wrapperComponent = materialsMetaForRun.wrapperComponent ?? 'TinyCard';
  const systemFull = buildSystemPromptForProtocol(protocol, framework, materialsVariant, options.promptConfig);
  const plainOnly = options.compareEmptySystemPlainOnly === true;
  const compareBoth = options.compareEmptySystem === true && !plainOnly;
  const selected = selectSampleCases(getLlmBenchmarkSampleCases(protocol), options);
  const repeat = Math.max(1, options.repeat ?? 1);
  const modelIds = resolveModelsForBench(options);
  if (selected.length === 0) {
    throw new Error('No scenario matched. Use one of ids from src/samples/index.ts');
  }

  const variantsPerRun = plainOnly ? 1 : compareBoth ? 2 : 1;
  const totalJobs = selected.length * repeat * modelIds.length * variantsPerRun;
  let doneJobs = 0;
  console.log(
    `[bench] Start generate samples: protocol=${protocol}, framework=${framework}, materialsVariant=${materialsVariant}, models=${modelIds.length}, scenarios=${selected.length}, repeat=${repeat}, plainOnly=${plainOnly}, compareFullPlusPlain=${compareBoth} (total jobs=${totalJobs})`,
  );
  const runMetadata = buildBenchmarkRunMetadata(options, {
    systemPrompt: systemFull,
    sampleCases: selected,
    materialsMeta: materialsMetaForRun,
  });

  const samplesRootDir = resolveSamplesDir(options.samplesDir);
  const runDir = options.targetSampleRunDir
    ? path.isAbsolute(options.targetSampleRunDir)
      ? path.resolve(options.targetSampleRunDir)
      : path.resolve(samplesRootDir, options.targetSampleRunDir)
    : path.resolve(samplesRootDir, formatBeijingRunDirName(new Date()));
  fs.mkdirSync(runDir, { recursive: true });
  console.log(`[bench] output runDir=${runDir}`);
  if (plainOnly && !options.targetSampleRunDir) {
    console.log(
      '[bench] 提示：当前为仅 plain，且未设置 targetSampleRunDir；样本会写入新目录。若要与已有 full 样本同批对比，请设置 targetSampleRunDir 或环境变量 BENCH_TARGET_SAMPLE_RUN_DIR 指向已有 run 目录。',
    );
  }

  const concurrency = Math.max(1, options.concurrency ?? 2);
  console.log(`[bench] concurrency=${concurrency}`);
  const retry = resolveRetryConfig(options);
  console.log(`[bench] retry=maxAttempts:${retry.maxAttempts}`);
  const skipExisting = options.skipExistingSampleFiles === true;
  if (skipExisting) {
    console.log('[bench] skipExistingSampleFiles=true（已存在的样本 .json 将跳过生成）');
  }

  type Job = {
    order: number;
    modelId: string;
    modelNameForFile: string;
    sampleCase: LlmBenchmarkSampleCase;
    runIndex: number;
    system: string;
    promptVariant: 'full' | 'plain';
  };

  const modelInstanceByModelId = new Map<string, Awaited<ReturnType<typeof resolveAiSdkModelForBench>>>();
  const modelSlugByModelId = new Map<string, string>();
  const modelRateLimiterByModelId = new Map<string, SlidingWindowRateLimiter>();
  for (const modelId of modelIds) {
    modelInstanceByModelId.set(modelId, await resolveAiSdkModelForBench(modelId));
    modelSlugByModelId.set(modelId, slugifyModelForFilename(modelId));
    const rateLimit = options.modelRateLimit?.[modelId];
    if (rateLimit) {
      modelRateLimiterByModelId.set(modelId, new SlidingWindowRateLimiter(rateLimit.requests, rateLimit.windowMs));
      console.log(`[bench] modelRateLimit ${modelId}=${rateLimit.requests}/${rateLimit.windowMs}ms`);
    }
  }

  const jobs: Job[] = [];
  for (const modelId of modelIds) {
    const modelSlug = modelSlugByModelId.get(modelId)!;
    for (const sampleCase of selected) {
      for (let runIndex = 1; runIndex <= repeat; runIndex++) {
        if (plainOnly) {
          jobs.push({
            order: jobs.length + 1,
            modelId,
            modelNameForFile: modelSlug,
            sampleCase,
            runIndex,
            system: '',
            promptVariant: 'plain',
          });
        } else {
          jobs.push({
            order: jobs.length + 1,
            modelId,
            modelNameForFile: modelSlug,
            sampleCase,
            runIndex,
            system: systemFull,
            promptVariant: 'full',
          });
          if (compareBoth) {
            jobs.push({
              order: jobs.length + 1,
              modelId,
              modelNameForFile: modelSlug,
              sampleCase,
              runIndex,
              system: '',
              promptVariant: 'plain',
            });
          }
        }
      }
    }
  }

  const files: string[] = [];
  let nextJobIdx = 0;

  async function worker(workerNo: number) {
    while (true) {
      const jobIdx = nextJobIdx;
      nextJobIdx++;
      if (jobIdx >= jobs.length) {
        return;
      }
      const job = jobs[jobIdx];

      const variantTag = job.promptVariant === 'plain' ? ', variant=plain(empty-system)' : '';
      console.log(
        `[bench][w${workerNo}] (${job.order}/${totalJobs}) generating model=${job.modelId}, scenario=${job.sampleCase.id}, run=${job.runIndex}${variantTag} ...`,
      );

      const sampleFile = getSampleFilePath(
        runDir,
        job.sampleCase.id,
        job.modelNameForFile,
        job.runIndex,
        job.promptVariant,
      );

      if (skipExisting && fs.existsSync(sampleFile)) {
        files.push(sampleFile);
        doneJobs++;
        console.log(`[bench][w${workerNo}] skip existing (${doneJobs}/${totalJobs})`);
        continue;
      }

      const modelInstance = modelInstanceByModelId.get(job.modelId);
      if (!modelInstance) {
        throw new Error(`Missing model instance for modelId: ${job.modelId}`);
      }

      const rateLimiter = modelRateLimiterByModelId.get(job.modelId);
      let rateLimitQueueWaitMs = 0;
      if (rateLimiter) {
        const waitedMs = await rateLimiter.waitTurn();
        rateLimitQueueWaitMs = waitedMs;
        if (waitedMs > 0) {
          console.log(`[bench][rate-limit] model=${job.modelId}, waited=${waitedMs}ms`);
        }
      }

      const sample = await generateSingleSample(
        modelInstance,
        job.modelId,
        job.sampleCase,
        job.runIndex,
        job.system,
        job.promptVariant,
        options.streamTimeoutMs,
        wrapperComponent,
        framework,
        materialsVariant,
        protocol,
        retry,
        rateLimitQueueWaitMs,
      );

      fs.mkdirSync(path.dirname(sampleFile), { recursive: true });
      fs.writeFileSync(sampleFile, JSON.stringify(sample, null, 2), 'utf-8');

      files.push(sampleFile);
      doneJobs++;
      console.log(`[bench][w${workerNo}] done (${doneJobs}/${totalJobs})`);
    }
  }

  const poolSize = Math.min(concurrency, jobs.length);
  const workers = Array.from({ length: poolSize }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  return {
    samplesDir: runDir,
    files,
    runMetadata,
  };
}
