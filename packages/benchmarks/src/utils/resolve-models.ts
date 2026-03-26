import type { LlmBenchmarkRunOptions } from '../framework/index';

/** 生成与报告共用的模型列表：`models` 非空时用之，否则 `[model]` */
export function resolveModelsForBench(options: LlmBenchmarkRunOptions): string[] {
  const raw = options.models?.map((m) => m.trim()).filter(Boolean) ?? [];
  if (raw.length > 0) {
    return raw;
  }
  return [options.model];
}

/** 文件名用短 slug，避免路径非法字符与碰撞 */
export function slugifyModelForFilename(model: string): string {
  const s = model.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  return (s || 'model').slice(0, 96);
}
