import fs from 'fs';
import path from 'path';
import { genPrompt } from '@opentiny/genui-sdk-core';
import { rendererConfig } from '@opentiny/genui-sdk-materials-vue-opentiny-vue/render-config';
import { ngRendererConfig } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/render-config';
import type { LlmBenchmarkRunOptions, LlmBenchmarkSample, LlmBenchmarkSampleCase } from './framework/index';
import { coreLlmBenchmarkSampleCases } from './samples/index';
import { generateSamplesPromptConfig } from './llm.config';
import { getSampleFilePath, resolveSamplesDir } from './utils/fs-paths';
import { resolveModelsForBench, slugifyModelForFilename } from './utils/resolve-models';
import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';

/**
 * 与 chat-genui 一致的 system 拼接；framework 来自运行配置（env / benchmark.config），其余来自 llm.config。
 */
function buildSystemPromptLikeChatGenui(framework: 'Vue' | 'Angular') {
  const { tgCustomConfig, specificPrompt, userAppendPrompt } = generateSamplesPromptConfig;
  const renderConfigForFramework = framework === 'Angular' ? ngRendererConfig : rendererConfig;
  return genPrompt(renderConfigForFramework, tgCustomConfig) + '\n' + specificPrompt + '\n' + userAppendPrompt;
}
/**
 * 根据 `scenarios` / `scenario` 过滤要生成样本的场景。
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
 */
export async function generateSamples(options: LlmBenchmarkRunOptions) {
  const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY (or OPENAI_API_KEY as fallback) is required');
  }
  const deepseek = createDeepSeek({
    apiKey,
    baseURL: process.env.DEEPSEEK_BASE_URL,
  });
  const framework = options.framework ?? 'Vue';
  const system = buildSystemPromptLikeChatGenui(framework);
  const selected = selectSampleCases(coreLlmBenchmarkSampleCases, options);
  const repeat = Math.max(1, options.repeat ?? 1);
  const modelIds = resolveModelsForBench(options);
  if (selected.length === 0) {
    throw new Error('No scenario matched. Use one of ids from src/samples/index.ts');
  }

  const baseDir = resolveSamplesDir(options.samplesDir);
  fs.mkdirSync(baseDir, { recursive: true });

  const files: string[] = [];
  for (const modelId of modelIds) {
    const modelInstance = deepseek(modelId);
    const modelSlug = slugifyModelForFilename(modelId);
    for (const sampleCase of selected) {
      for (let runIndex = 1; runIndex <= repeat; runIndex++) {
        const sample = await generateSingleSample(modelInstance, modelId, sampleCase, runIndex, system);
        const sampleFile = getSampleFilePath(baseDir, sampleCase.id, runIndex, modelSlug);
        // 防御式：即使父目录没创建成功或 sampleFile 被拼成多级目录，也能避免 ENOENT。
        fs.mkdirSync(path.dirname(sampleFile), { recursive: true });
        fs.writeFileSync(sampleFile, JSON.stringify(sample, null, 2), 'utf-8');
        files.push(sampleFile);
      }
    }
  }
  return {
    samplesDir: baseDir,
    files,
  };
}
