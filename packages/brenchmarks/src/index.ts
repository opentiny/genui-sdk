export * from './framework/index';
export * from './examples/index';
export * from './generate-samples';
export * from './run-report';

import { generateSamples } from './generate-samples';
import { runReport } from './run-report';
import type { LlmBenchmarkRunOptions } from './framework/index';

/**
 * 解析 CLI 参数，映射为 benchmark 运行配置。
 */
function parseArgv(argv: string[]): LlmBenchmarkRunOptions & { mode: 'all' | 'generate' | 'report' } {
  const options: LlmBenchmarkRunOptions = {
    model: process.env.BENCH_MODEL || 'gpt-4o-mini',
  };
  let mode: 'all' | 'generate' | 'report' = 'all';
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--mode' && argv[i + 1]) {
      const value = argv[++i];
      if (value === 'all' || value === 'generate' || value === 'report') {
        mode = value;
      }
      continue;
    }
    if (arg === '--scenario' && argv[i + 1]) {
      options.scenario = argv[++i];
      continue;
    }
    if (arg === '--model' && argv[i + 1]) {
      options.model = argv[++i];
      continue;
    }
    if (arg === '--json') {
      options.json = true;
    }
    if (arg === '--samples-dir' && argv[i + 1]) {
      options.samplesDir = argv[++i];
    }
    if (arg === '--output-dir' && argv[i + 1]) {
      options.outputDir = argv[++i];
    }
  }
  return {
    ...options,
    mode,
  };
}

/**
 * 程序入口：解析参数并执行 benchmark。
 */
async function main() {
  const options = parseArgv(process.argv.slice(2));
  if (options.mode === 'generate') {
    await generateSamples(options);
    return;
  }
  if (options.mode === 'report') {
    await runReport(options);
    return;
  }
  await generateSamples(options);
  await runReport(options);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
