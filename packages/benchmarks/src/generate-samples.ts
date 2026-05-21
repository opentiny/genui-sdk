import fs from 'node:fs';
import path from 'node:path';
import { genPrompt } from '@opentiny/genui-sdk-core';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';
import { ngRendererConfig } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/render-config';
import type { LlmBenchmarkRunOptions, LlmBenchmarkSample, LlmBenchmarkSampleCase } from './framework/index';
import { coreLlmBenchmarkSampleCases } from './samples';
import {
  formatBeijingRunDirName,
  getSampleFilePath,
  hasTinyCardComponentDeclaration,
  resolveAiSdkModelForBench,
  resolveModelsForBench,
  resolveSamplesDir,
  resolveStreamTextUsage,
  benchStreamTextAbortSignal,
  slugifyModelForFilename,
} from './utils';
import { computeTpotMs } from './utils';
import { streamText } from 'ai';

/**
 * 与 chat-genui 一致的 system 拼接；framework 来自运行配置（env / benchmark.config），其余来自 llm.config。
 * @param framework 前端框架类型（影响 render-config）
 * @param promptConfig prompt 拼接配置
 * @returns 最终 system prompt
 */
function buildSystemPrompt(framework: 'Vue' | 'Angular', promptConfig: LlmBenchmarkRunOptions['promptConfig']) {
  const { tgCustomConfig, specificPrompt, userAppendPrompt } = promptConfig;
  const renderConfigForFramework = framework === 'Angular' ? ngRendererConfig : rendererConfig;
  return genPrompt(renderConfigForFramework, tgCustomConfig) + '\n' + specificPrompt + '\n' + userAppendPrompt;
}
/**
 * 根据 `scenarios` / `scenario` 过滤要生成样本的场景。
 * @param cases 内置样本场景列表
 * @param options 运行配置
 * @returns 过滤后的场景列表
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
 * @param modelInstance 已初始化的模型实例
 * @param model 模型 id
 * @param sampleCase 单个基准场景
 * @param runIndex 当前重复序号（从 1 开始）
 * @param system system prompt（对照模式可为空字符串）
 * @param promptVariant 完整 system 或空 system 对照
 * @param streamTimeoutMs `streamText` 超时毫秒数；`undefined` 或 `≤0` 表示不启用
 * @returns 样本对象（包含指标与输出）
 */
async function generateSingleSample(
  modelInstance: Awaited<ReturnType<typeof resolveAiSdkModelForBench>>,
  model: string,
  sampleCase: LlmBenchmarkSampleCase,
  runIndex: number,
  system: string,
  promptVariant: 'full' | 'plain',
  streamTimeoutMs: number | undefined,
): Promise<LlmBenchmarkSample> {
  const start = Date.now();
  let firstTokenAt = 0;
  let firstTinyCardAt = 0;
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
        const before = output;
        output += chunk.text;
        const now = Date.now();
        if (!firstTinyCardAt && hasTinyCardComponentDeclaration(output) && !hasTinyCardComponentDeclaration(before)) {
          firstTinyCardAt = now;
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
  const ttftMs = firstTokenAt ? firstTokenAt - start : undefined;
  const tpotMs = ttftMs == null ? undefined : computeTpotMs(ttftMs, totalMs, completionTokens);
  const firstObservableComponentMs = firstTinyCardAt ? firstTinyCardAt - start : undefined;

  return {
    scenario: sampleCase.id,
    promptVariant,
    runIndex,
    model,
    messages: sampleCase.messages,
    output,
    generatedAt: new Date().toISOString(),
    metrics: {
      ...(ttftMs != null ? { ttftMs } : {}),
      totalMs,
      ...(firstObservableComponentMs != null ? { firstObservableComponentMs } : {}),
      ...(tpotMs !== undefined ? { tpotMs } : {}),
      promptTokens,
      completionTokens,
      totalTokens,
      rawOutputChars: output.length,
      errorMessage,
    },
  };
}

/**
 * 批量生成样本并落盘。
 * @param options 运行配置（模型/框架/场景/重复次数等）
 * @returns 本次生成的样本目录与写入的文件路径列表
 */
export async function generateSamples(options: LlmBenchmarkRunOptions) {
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
  const framework = options.framework ?? 'Vue';
  const systemFull = buildSystemPrompt(framework, options.promptConfig);
  const plainOnly = options.compareEmptySystemPlainOnly === true;
  const compareBoth = options.compareEmptySystem === true && !plainOnly;
  const selected = selectSampleCases(coreLlmBenchmarkSampleCases, options);
  const repeat = Math.max(1, options.repeat ?? 1);
  const modelIds = resolveModelsForBench(options);
  if (selected.length === 0) {
    throw new Error('No scenario matched. Use one of ids from src/samples/index.ts');
  }

  const variantsPerRun = plainOnly ? 1 : compareBoth ? 2 : 1;
  const totalJobs = selected.length * repeat * modelIds.length * variantsPerRun;
  let doneJobs = 0;
  const startedAt = Date.now();
  console.log(
    `[bench] Start generate samples: framework=${framework}, models=${modelIds.length}, scenarios=${selected.length}, repeat=${repeat}, plainOnly=${plainOnly}, compareFullPlusPlain=${compareBoth} (total jobs=${totalJobs})`,
  );

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
  const skipExisting = options.skipExistingSampleFiles === true;
  if (skipExisting) {
    console.log('[bench] skipExistingSampleFiles=true（已存在的样本 .json 将跳过生成）');
  }

  type Job = {
    order: number; // 从 1 开始的总任务序号
    modelId: string;
    // 仅用于文件名的安全模型名（由 modelId slugify 得到）
    modelNameForFile: string;
    sampleCase: LlmBenchmarkSampleCase;
    runIndex: number;
    system: string;
    promptVariant: 'full' | 'plain';
  };

  const modelInstanceByModelId = new Map<string, Awaited<ReturnType<typeof resolveAiSdkModelForBench>>>();
  const modelSlugByModelId = new Map<string, string>();
  for (const modelId of modelIds) {
    modelInstanceByModelId.set(modelId, await resolveAiSdkModelForBench(modelId));
    modelSlugByModelId.set(modelId, slugifyModelForFilename(modelId));
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
        const elapsedMs = Date.now() - startedAt;
        const avgPerJobMs = elapsedMs / Math.max(1, doneJobs);
        const remainJobs = totalJobs - doneJobs;
        const remainMs = Math.round(avgPerJobMs * remainJobs);
        console.log(
          `[bench][w${workerNo}] skip existing (${doneJobs}/${totalJobs}) -> ${sampleFile} | est remain=${remainMs}ms`,
        );
        continue;
      }

      const modelInstance = modelInstanceByModelId.get(job.modelId);
      if (!modelInstance) {
        throw new Error(`Missing model instance for modelId: ${job.modelId}`);
      }

      const sample = await generateSingleSample(
        modelInstance,
        job.modelId,
        job.sampleCase,
        job.runIndex,
        job.system,
        job.promptVariant,
        options.streamTimeoutMs,
      );

      // 防御式：即使父目录没创建成功或 sampleFile 被拼成多级目录，也能避免 ENOENT。
      fs.mkdirSync(path.dirname(sampleFile), { recursive: true });
      fs.writeFileSync(sampleFile, JSON.stringify(sample, null, 2), 'utf-8');

      files.push(sampleFile);
      doneJobs++;

      const elapsedMs = Date.now() - startedAt;
      const avgPerJobMs = elapsedMs / Math.max(1, doneJobs);
      const remainJobs = totalJobs - doneJobs;
      const remainMs = Math.round(avgPerJobMs * remainJobs);

      console.log(
        `[bench][w${workerNo}] done (${doneJobs}/${totalJobs}) -> ${sampleFile} | ttftMs=${sample.metrics.ttftMs ?? '-'}, tinyCardMs=${sample.metrics.firstObservableComponentMs ?? '-'}, totalMs=${sample.metrics.totalMs} | est remain=${remainMs}ms`,
      );
    }
  }

  const poolSize = Math.min(concurrency, jobs.length);
  const workers = Array.from({ length: poolSize }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  return {
    samplesDir: runDir,
    files,
  };
}
