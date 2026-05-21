import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 与 `main.ts`、`.env` 同级：packages/benchmarks */
const benchmarksPackageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/**
 * 读取环境变量并 trim；`undefined`、空串、仅空白视为未设置。
 */
function envTrimmed(key: string): string | undefined {
  const raw = process.env[key];
  if (raw === undefined) return undefined;
  const t = raw.trim();
  return t === '' ? undefined : t;
}

/**
 * 解析 `BENCH_MAAS_MODELS_PATH` 指向的 `maas-models.json` 绝对路径（相对 benchmarks 包根或绝对路径）。
 * 与 {@link listMaasManifestModelNames}、`resolveAiSdkModelForBench` 使用同一清单文件。
 */
export function resolveMaasModelsJsonPath(): string {
  const configured = envTrimmed('BENCH_MAAS_MODELS_PATH');
  if (configured === undefined) {
    throw new Error(
      'BENCH_MAAS_MODELS_PATH is not set (or is blank). Set it in packages/benchmarks/.env to the maas-models.json path: absolute, or relative to the benchmarks package root (next to main.ts).',
    );
  }
  const absolute = path.isAbsolute(configured)
    ? configured
    : path.resolve(benchmarksPackageDir, configured);
  return path.normalize(absolute);
}

/**
 * 读取 `maas-models.json` 中全部模型的 `name`（与 playground / resolveAiSdkModelForBench 的展示名一致）。
 */
export function listMaasManifestModelNames(): string[] {
  const filePath = resolveMaasModelsJsonPath();
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as Record<string, { models?: Array<{ name?: string }> }>;
  const names: string[] = [];
  for (const provider of Object.values(data)) {
    const models = Array.isArray(provider?.models) ? provider.models : [];
    for (const m of models) {
      if (typeof m?.name === 'string' && m.name) {
        names.push(m.name);
      }
    }
  }
  return names;
}
