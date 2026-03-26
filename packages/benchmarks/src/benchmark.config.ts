import type { LlmBenchmarkRunOptions } from './framework/index';

/**
 * 基准运行默认配置（可被同目录下 `.env` 中 `BENCH_*` 变量覆盖）。
 */
export const benchmarkRunConfig: LlmBenchmarkRunOptions = {
  model: 'gpt-4o-mini',
  /** 多模型对比时填写，如 ['deepseek-chat','deepseek-reasoner']；留空则只用 model */
  models: undefined,
  framework: 'Vue',
  scenario: undefined,
  scenarios: undefined,
  repeat: 1,
  json: false,
  samplesDir: undefined,
  outputDir: undefined,
};
