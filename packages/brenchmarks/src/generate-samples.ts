import fs from 'fs';
import type { LlmBenchmarkRunOptions, LlmBenchmarkSample, LlmBenchmarkExample } from './framework/index';
import { coreLlmBenchmarkExamples } from './examples/index';
import { getSampleFilePath, resolveSamplesDir } from './utils/fs-paths';
import { streamText } from 'ai';
import { createDeepSeek } from '@ai-sdk/deepseek';
/**
 * 根据命令行过滤条件选择要生成样本的场景。
 */
function selectExamples(examples: LlmBenchmarkExample[], options: LlmBenchmarkRunOptions) {
  if (!options.scenario) {
    return examples;
  }
  return examples.filter((item) => item.id === options.scenario);
}

/**
 * 为单个场景调用模型并写入样本文件。
 */
async function generateSingleSample(
  modelInstance: ReturnType<ReturnType<typeof createDeepSeek>>,
  model: string,
  example: LlmBenchmarkExample,
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
      messages: [
        {
          role: 'system',
          content: '你是一个 schemaJson 生成器。只输出 ```schemaJson ...``` 代码块，不输出其他文本。',
        },
        {
          role: 'user',
          content: example.prompt,
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
    scenario: example.id,
    model,
    prompt: example.prompt,
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
  const modelInstance = deepseek(options.model);
  const selected = selectExamples(coreLlmBenchmarkExamples, options);
  if (selected.length === 0) {
    throw new Error('No scenario matched. Use one of examples from src/examples/index.ts');
  }

  const baseDir = resolveSamplesDir(options.samplesDir);
  fs.mkdirSync(baseDir, { recursive: true });

  const files: string[] = [];
  for (const example of selected) {
    const sample = await generateSingleSample(modelInstance, options.model, example);
    const sampleFile = getSampleFilePath(baseDir, example.id);
    fs.writeFileSync(sampleFile, JSON.stringify(sample, null, 2), 'utf-8');
    files.push(sampleFile);
  }
  return {
    samplesDir: baseDir,
    files,
  };
}
