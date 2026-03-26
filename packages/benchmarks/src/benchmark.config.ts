import type { LlmBenchmarkRunOptions } from './framework/index';

/**
 * 基准运行默认配置（可被同目录下 `.env` 中 `BENCH_*` 变量覆盖）。
 */
export const benchmarkConfig: LlmBenchmarkRunOptions = {
  /** 单模型模式下使用的模型名（当 models 为空时生效） */
  model: 'DeepSeek-V3.2',
  /** 多模型对比列表；有值时优先于 model，按列表逐模型生成并汇总报告 */
  models: undefined,
  /** Prompt 生成使用的前端框架物料（影响系统提示词的配置） */
  framework: 'Vue',
  /** 单场景过滤（兼容项）；为空时不过滤 */
  scenario: undefined,
  /** 多场景过滤（优先级高于 scenario）；为空时跑全部内置场景 */
  scenarios: undefined,
  /** 每个“模型 × 场景”重复执行次数（最小为 1） */
  repeat: 1,
  /** 生成阶段并发度（最小为 1）；值越大请求并发越高 */
  concurrency: 2,
  /** 生成样本时的 prompt 组合配置（genPrompt + specificPrompt + userAppendPrompt） */
  promptConfig: {
    /** genPrompt 的自定义配置（对应 metadata.tinygenui 形态） */
    tgCustomConfig: {},
    /** 固定附加到 system 的提示词片段 */
    specificPrompt: 'schemaJson必须使用```schemaJson```包裹。',
    /** 用户自定义追加提示词（通常用于临时调优） */
    userAppendPrompt: '',
  },
  /** 是否在控制台输出 JSON 结果（true: JSON；false: 表格 + 汇总） */
  json: false,
  /** 输出根目录（默认 reports/）；每次运行会在其下创建时间戳子目录 */
  samplesDir: undefined,
  /** 报告输出目录（默认跟随本次运行目录；一般无需单独配置） */
  outputDir: undefined,
};
