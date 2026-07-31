import type { LlmBenchmarkRunOptions } from './framework/index';

/**
 * 基准运行默认配置（可被同目录下 `.env` 中 `BENCH_*` 变量覆盖）。
 */
export const benchmarkConfig: LlmBenchmarkRunOptions = {
  // 单模型 id；未配置 `models` 时必填其一。与 `models` 并存时可作「主模型」元数据（报告 / Judge 默认等）
  model: 'DeepSeek-V3.2',
  // 多模型对比列表；有值时优先于 model，按列表逐模型生成并汇总报告
  models: undefined,
  // 为 true 时默认用 maas-models.json 中全部模型名填满 models（显式 models / BENCH_MODELS 优先）
  modelsFromMaasManifest: false,
  // Prompt 生成使用的前端框架物料（影响系统提示词的配置）
  framework: 'Vue',
  // materials 包 meta：standard → materialsMeta；Vue mini → miniMaterialsMeta（BENCH_MATERIALS_VARIANT）
  materialsVariant: 'standard',
  // 单场景过滤（兼容项）；为空时不过滤
  scenario: undefined,
  // 多场景过滤（优先级高于 scenario）；为空时跑全部内置场景
  scenarios: ['simple-form'],
  // 每个“模型 × 场景”重复执行次数（最小为 1）
  repeat: 1,
  // 为 true 时额外生成空 system 的「纯文本」对照样本（*_plain.json）；可用 BENCH_COMPARE_EMPTY_SYSTEM=true
  compareEmptySystem: false,
  // 为 true 时仅生成 plain（不生成 full）。默认 false：走 SDK genPrompt 主路径
  compareEmptySystemPlainOnly: false,
  // 非空时样本直接写入该目录（不新建时间戳子目录）；相对路径相对于样本根目录（默认 reports/）
  targetSampleRunDir: undefined,
  // 生成阶段并发度（最小为 1）；值越大请求并发越高
  concurrency: 5,
  // streamText 单次请求超时（毫秒）；可由 BENCH_STREAM_TIMEOUT_MS 覆盖；0=不限制
  streamTimeoutMs: 600_000,
  // 生成样本时的 prompt 组合配置（genPrompt + specificPrompt + userAppendPrompt）
  promptConfig: {
    // genPrompt 的自定义配置（对应 metadata.tinygenui 形态）
    tgCustomConfig: {},
    // 固定附加到 system 的提示词片段
    specificPrompt: 'schemaJson必须使用```schemaJson```包裹。',
    // 用户自定义追加提示词（通常用于临时调优）
    userAppendPrompt: '',
  },
  // LLM-as-a-Judge 配置（默认关闭，避免报告阶段额外模型调用）
  llmJudge: {
    // 是否启用 Judge 评估
    enabled: true,
    // Judge 模型 id；为空则复用 model
    model: undefined,
    // 可选 system prompt；为空时使用内置默认规则
    systemPrompt: undefined,
  },
  // 是否在控制台输出 JSON 结果（true: JSON；false: 表格 + 汇总）
  json: false,
  // 是否在报告目录生成 report_<runDir>.xlsx（汇总 + 原始 JSON 样本展开）
  writeExcel: true,
  // 输出根目录（默认 reports/）；每次运行会在其下创建时间戳子目录
  samplesDir: undefined,
  // 报告输出目录（默认跟随本次运行目录；一般无需单独配置）
  outputDir: undefined,
};
