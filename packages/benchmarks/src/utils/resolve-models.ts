import { createHash } from 'node:crypto';

import type { LlmBenchmarkRunOptions } from '../framework/index';

/** 保序去重：后出现的重复 id 丢弃。 */
function dedupePreserveOrder(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/**
 * 生成与报告共用的模型列表：`models` 非空时用之（**保序去重**）；否则使用非空的单 `model`；二者皆空时抛错。
 * @param options 运行配置
 * @returns 最终参与执行的模型 id 列表
 */
export function resolveModelsForBench(options: LlmBenchmarkRunOptions): string[] {
  const raw = options.models?.map((m) => m.trim()).filter(Boolean) ?? [];
  if (raw.length > 0) {
    return dedupePreserveOrder(raw);
  }
  const single = options.model?.trim();
  if (single) {
    return [single];
  }
  throw new Error('Set `model` and/or a non-empty `models` array (e.g. BENCH_MODEL / BENCH_MODELS).');
}

/**
 * 主模型 id：用于报告元数据、Judge 未单独指定时的默认模型等。
 * 优先使用显式 `model`，否则取 `models` 中第一个非空项。
 * 调用方应已保证 `model` 与 `models` 不同时为空（例如已通过 {@link resolveModelsForBench}）。
 */
export function resolvePrimaryBenchmarkModelId(
  options: Pick<LlmBenchmarkRunOptions, 'model' | 'models'>,
): string {
  const explicit = options.model?.trim();
  if (explicit) return explicit;
  const first = options.models?.map((m) => m.trim()).find((m) => m.length > 0);
  if (first) return first;
  throw new Error('Set `model` or a non-empty `models` array (e.g. BENCH_MODEL / BENCH_MODELS).');
}

const SLUG_MAX_LEN = 96;
/** 取自完整 model 的 SHA256 十六进制前缀，保证不同 id 在截断/字符归一后仍不共撞文件名。 */
const SLUG_HASH_HEX_LEN = 12;

/**
 * 将模型 id 转为安全、稳定且**不易碰撞**的文件名片段：可读前缀 + `_` + 哈希后缀。
 * 哈希对**完整原始字符串**计算，避免仅靠 lossy slug 截断导致不同模型覆盖同一文件。
 */
export function slugifyModelForFilename(model: string): string {
  const digest = createHash('sha256').update(model, 'utf8').digest('hex').slice(0, SLUG_HASH_HEX_LEN);
  const suffix = `_${digest}`;
  const maxPrefix = Math.max(1, SLUG_MAX_LEN - suffix.length);
  const raw = model.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
  const base = (raw || 'model').slice(0, maxPrefix).replace(/_+$/g, '');
  return `${base}${suffix}`;
}
