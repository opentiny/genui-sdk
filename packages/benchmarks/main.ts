import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

import type { LlmBenchmarkRunOptions } from './src/framework/index';
import { benchmarkConfig } from './src/benchmark.config';
import { generateSamples } from './src/generate-samples';
import { runReport } from './src/run-report';
import { envBool, envFramework, envPositiveInt, envString, envStringList } from './src/utils';

const packageDir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(packageDir, '.env') });

/**
 * 运行选项：以 `src/benchmark.config.ts` 为基准，`.env` 中 `BENCH_*` 覆盖对应项。
 * @returns 最终可执行的运行配置
 */
function resolveRunOptions(): LlmBenchmarkRunOptions {
  const {
    model,
    models: defaultModels,
    framework,
    scenario,
    scenarios: defaultScenarios,
    repeat,
    concurrency: defaultConcurrency,
    promptConfig,
    llmJudge,
    json,
    samplesDir,
    outputDir,
  } = benchmarkConfig;
  const scenarios = envStringList('BENCH_SCENARIOS', defaultScenarios);
  const models = envStringList('BENCH_MODELS', defaultModels);
  const concurrency = envPositiveInt('BENCH_CONCURRENCY', defaultConcurrency ?? 2);
  const judgeEnabled = envBool('BENCH_LLM_JUDGE', llmJudge?.enabled ?? false);
  const judgeModel = envString('BENCH_LLM_JUDGE_MODEL', llmJudge?.model);
  return {
    model: envString('BENCH_MODEL', model) ?? model,
    models: models && models.length > 0 ? models : undefined,
    framework: envFramework('BENCH_FRAMEWORK', framework),
    scenario: envString('BENCH_SCENARIO', scenario),
    scenarios,
    repeat: envPositiveInt('BENCH_REPEAT', repeat ?? 1),
    concurrency,
    promptConfig,
    llmJudge: {
      enabled: judgeEnabled,
      model: judgeModel,
      systemPrompt: llmJudge?.systemPrompt,
    },
    json: envBool('BENCH_JSON', json ?? false),
    samplesDir: envString('BENCH_SAMPLES_DIR', samplesDir),
    outputDir: envString('BENCH_OUTPUT_DIR', outputDir),
  };
}

/**
 * 统一入口：固定串行执行 generate + report。
 * - 先生成 samples（在线调用模型）
 * - 再根据 samples 做离线统计并输出报告
 */
async function main() {
  const options = resolveRunOptions();
  const gen = await generateSamples(options);
  await runReport({
    ...options,
    // 让 report 只读取本次 runDir 下的样本
    samplesDir: gen.samplesDir,
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
