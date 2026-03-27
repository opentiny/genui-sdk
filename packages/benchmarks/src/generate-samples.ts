import fs from 'fs';
import path from 'path';
import { genPrompt } from '@opentiny/genui-sdk-core';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';
import { ngRendererConfig } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/render-config';
import type { LlmBenchmarkRunOptions, LlmBenchmarkSample, LlmBenchmarkSampleCase } from './framework/index';
import { coreLlmBenchmarkSampleCases } from './samples';
import { formatBeijingRunDirName, getSampleFilePath, resolveModelsForBench, resolveSamplesDir, slugifyModelForFilename } from './utils';
import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';

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
 * @param system system prompt
 * @returns 样本对象（包含指标与输出）
 */
async function generateSingleSample(
  modelInstance: ReturnType<ReturnType<typeof createDeepSeek>>,
  model: string,
  sampleCase: LlmBenchmarkSampleCase,
  runIndex: number,
  system: string,
): Promise<LlmBenchmarkSample> {
  const start = Date.now();
  let firstTokenAt = 0;
  let output = '';
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let errorMessage: string | undefined;

  try {
    const stream = streamText({
      model: modelInstance,
      temperature: 0,
      system,
      messages: [
        {
          role: 'user',
          content: sampleCase.prompt,
        },
      ],
    });

    for await (const chunk of stream.fullStream) {
      if (chunk.type === 'text-delta' && chunk.text) {
        if (!firstTokenAt) {
          firstTokenAt = Date.now();
        }
        output += chunk.text;
      }
      if (chunk.type === 'finish') {
        promptTokens = chunk.totalUsage?.inputTokens ?? promptTokens;
        completionTokens = chunk.totalUsage?.outputTokens ?? completionTokens;
        totalTokens = chunk.totalUsage?.totalTokens ?? totalTokens;
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
    if (!firstTokenAt && output) {
      // 兜底处理：如果流事件类型变更，至少保证 TTFT 可被记录
        firstTokenAt = Date.now();
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  return {
    scenario: sampleCase.id,
    runIndex,
    model,
    prompt: sampleCase.prompt,
    output,
    generatedAt: new Date().toISOString(),
    metrics: {
      ttftMs: firstTokenAt ? firstTokenAt - start : 0,
      totalMs: Date.now() - start,
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
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY (or OPENAI_API_KEY as fallback) is required');
  }
  // 生成阶段通常需要你持续观察进度；避免 SDK warning 淹没关键输出。
  (globalThis as any).AI_SDK_LOG_WARNINGS = false;
  const deepseek = createDeepSeek({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL,
  });
  const framework = options.framework ?? 'Vue';
  const system = buildSystemPrompt(framework, options.promptConfig);
  const selected = selectSampleCases(coreLlmBenchmarkSampleCases, options);
  const repeat = Math.max(1, options.repeat ?? 1);
  const modelIds = resolveModelsForBench(options);
  if (selected.length === 0) {
    throw new Error('No scenario matched. Use one of ids from src/samples/index.ts');
  }

  const totalJobs = selected.length * repeat * modelIds.length;
  let doneJobs = 0;
  const startedAt = Date.now();
  console.log(
    `[bench] Start generate samples: framework=${framework}, models=${modelIds.length}, scenarios=${selected.length}, repeat=${repeat} (total jobs=${totalJobs})`,
  );

  const samplesRootDir = resolveSamplesDir(options.samplesDir);
  const runDirName = formatBeijingRunDirName(new Date());
  const runDir = path.resolve(samplesRootDir, runDirName);
  fs.mkdirSync(runDir, { recursive: true });
  console.log(`[bench] output runDir=${runDir}`);

  const concurrency = Math.max(1, options.concurrency ?? 2);
  console.log(`[bench] concurrency=${concurrency}`);

  type Job = {
    order: number; // 从 1 开始的总任务序号
    modelId: string;
    /** 仅用于文件名的安全模型名（由 modelId slugify 得到） */
    modelNameForFile: string;
    sampleCase: LlmBenchmarkSampleCase;
    runIndex: number;
  };

  const modelInstanceByModelId = new Map<string, ReturnType<ReturnType<typeof createDeepSeek>>>();
  const modelSlugByModelId = new Map<string, string>();
  for (const modelId of modelIds) {
    modelInstanceByModelId.set(modelId, deepseek(modelId));
    modelSlugByModelId.set(modelId, slugifyModelForFilename(modelId));
  }

  const jobs: Job[] = [];
  for (const modelId of modelIds) {
    const modelSlug = modelSlugByModelId.get(modelId)!;
    for (const sampleCase of selected) {
      for (let runIndex = 1; runIndex <= repeat; runIndex++) {
        jobs.push({
          order: jobs.length + 1,
          modelId,
          modelNameForFile: modelSlug,
          sampleCase,
          runIndex,
        });
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

      console.log(
        `[bench][w${workerNo}] (${job.order}/${totalJobs}) generating model=${job.modelId}, scenario=${job.sampleCase.id}, run=${job.runIndex} ...`,
      );

      const modelInstance = modelInstanceByModelId.get(job.modelId);
      if (!modelInstance) {
        throw new Error(`Missing model instance for modelId: ${job.modelId}`);
      }

      const sample = await generateSingleSample(modelInstance, job.modelId, job.sampleCase, job.runIndex, system);
      const sampleFile = getSampleFilePath(runDir, job.sampleCase.id, job.modelNameForFile, job.runIndex);

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
        `[bench][w${workerNo}] done (${doneJobs}/${totalJobs}) -> ${sampleFile} | ttftMs=${sample.metrics.ttftMs}, totalMs=${sample.metrics.totalMs} | est remain=${remainMs}ms`,
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
