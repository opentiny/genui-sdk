import type { LlmBenchmarkRunOptions } from '../framework/index';

/**
 * 生成与报告共用的模型列表：`models` 非空时用之，否则 `[model]`。
 * @param options 运行配置
 * @returns 最终参与执行的模型 id 列表
 */
export function resolveModelsForBench(options: LlmBenchmarkRunOptions): string[] {
  const raw = options.models?.map((m) => m.trim()).filter(Boolean) ?? [];
  if (raw.length > 0) {
    return raw;
  }
  return [options.model];
}

/**
 * 将模型名转换为适合文件名的短 slug。
 * @param model 原始模型名
 * @returns 文件安全的模型名（长度上限 96）
 */
export function slugifyModelForFilename(model: string): string {
  const s = model.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return (s || 'model').slice(0, 96);
}
