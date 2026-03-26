import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

import type { LlmBenchmarkRunOptions } from './src/framework/index';
import { benchmarkConfig } from './src/benchmark.config';
import { generateSamples } from './src/generate-samples';
import { runReport } from './src/run-report';

const packageDir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(packageDir, '.env') });

/**
 * 读取环境变量字符串值；空字符串视为未设置。
 * @param key 环境变量名
 * @param fallback 未设置时的回退值
 */
function envString(key: string, fallback: string | undefined): string | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  return v;
}

/**
 * 读取环境变量布尔值；空字符串视为未设置。
 * 接受：`1/true/yes` 视为 `true`。
 * @param key 环境变量名
 * @param fallback 未设置时的回退值
 */
function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  return v === '1' || v === 'true' || v.toLowerCase() === 'yes';
}

/**
 * 读取环境变量列表（逗号分隔）；空字符串视为未设置。
 * @param key 环境变量名
 * @param fallback 未设置时的回退值
 */
function envStringList(key: string, fallback?: string[]): string[] | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  const list = v
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  return list.length > 0 ? list : fallback;
}

/**
 * 读取环境变量正整数；空字符串视为未设置；小于 1 视为无效。
 * @param key 环境变量名
 * @param fallback 未设置/无效时的回退值
 */
function envPositiveInt(key: string, fallback: number): number {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  const parsed = Number.parseInt(v, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return parsed;
}

/**
 * 读取框架选择（Vue/Angular）。
 * @param fallback 默认框架
 */
function envFramework(fallback: 'Vue' | 'Angular' | undefined): 'Vue' | 'Angular' {
  const v = process.env.BENCH_FRAMEWORK;
  if (v === 'Angular' || v === 'Vue') {
    return v;
  }
  if (fallback === 'Angular' || fallback === 'Vue') {
    return fallback;
  }
  return 'Vue';
}

/**
 * 运行选项：以 `src/benchmark.config.ts` 为基准，`.env` 中 `BENCH_*` 覆盖对应项。
 * @returns 最终可执行的运行配置
 */
function resolveRunOptions(): LlmBenchmarkRunOptions {
  const c = benchmarkConfig;
  const scenarios = envStringList('BENCH_SCENARIOS', c.scenarios);
  const models = envStringList('BENCH_MODELS', c.models);
  const concurrency = envPositiveInt('BENCH_CONCURRENCY', c.concurrency ?? 2);
  return {
    model: envString('BENCH_MODEL', c.model) ?? c.model,
    models: models && models.length > 0 ? models : undefined,
    framework: envFramework(c.framework),
    scenario: envString('BENCH_SCENARIO', c.scenario),
    scenarios,
    repeat: envPositiveInt('BENCH_REPEAT', c.repeat ?? 1),
    concurrency,
    promptConfig: c.promptConfig,
    json: envBool('BENCH_JSON', c.json ?? false),
    samplesDir: envString('BENCH_SAMPLES_DIR', c.samplesDir),
    outputDir: envString('BENCH_OUTPUT_DIR', c.outputDir),
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
