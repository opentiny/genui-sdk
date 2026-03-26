import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

import type { LlmBenchmarkRunOptions } from './src/framework/index';
import { benchmarkRunConfig } from './src/benchmark.config';
import { generateSamples } from './src/generate-samples';
import { runReport } from './src/run-report';

const packageDir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.join(packageDir, '.env') });

function envString(key: string, fallback: string | undefined): string | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  return v;
}

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  return v === '1' || v === 'true' || v.toLowerCase() === 'yes';
}

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
 */
function resolveRunOptions(): LlmBenchmarkRunOptions {
  const c = benchmarkRunConfig;
  const scenarios = envStringList('BENCH_SCENARIOS', c.scenarios);
  const models = envStringList('BENCH_MODELS', c.models);
  return {
    model: envString('BENCH_MODEL', c.model) ?? c.model,
    models: models && models.length > 0 ? models : undefined,
    framework: envFramework(c.framework),
    scenario: envString('BENCH_SCENARIO', c.scenario),
    scenarios,
    repeat: envPositiveInt('BENCH_REPEAT', c.repeat ?? 1),
    json: envBool('BENCH_JSON', c.json ?? false),
    samplesDir: envString('BENCH_SAMPLES_DIR', c.samplesDir),
    outputDir: envString('BENCH_OUTPUT_DIR', c.outputDir),
  };
}

/**
 * 统一入口：固定串行执行 generate + report。
 */
async function main() {
  const options = resolveRunOptions();
  await generateSamples(options);
  await runReport(options);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
