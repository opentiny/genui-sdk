/**
 * 读取环境变量字符串值；空字符串视为未设置。
 * @param key 环境变量名
 * @param fallback 未设置时的回退值
 * @returns 环境变量值或回退值
 */
export function envString(key: string, fallback: string | undefined): string | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  return v;
}

/**
 * 读取环境变量布尔值；空字符串或仅空白视为未设置。
 * 接受：`1`、`true`、`yes`（`true` / `yes` 大小写不敏感）视为 `true`。
 * @param key 环境变量名
 * @param fallback 未设置时的回退值
 * @returns 解析后的布尔值
 */
export function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  const t = v.trim();
  if (t === '') {
    return fallback;
  }
  return t === '1' || t.toLowerCase() === 'true' || t.toLowerCase() === 'yes';
}

/**
 * 读取环境变量列表（逗号分隔）；空字符串视为未设置。
 * @param key 环境变量名
 * @param fallback 未设置时的回退值
 * @returns 解析后的字符串列表
 */
export function envStringList(key: string, fallback?: string[]): string[] | undefined {
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
 * @returns 解析后的正整数
 */
export function envPositiveInt(key: string, fallback: number): number {
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

export type EnvRateLimitConfig = Record<string, { requests: number; windowMs: number }>;

/**
 * 读取模型限速配置，如 `{"model-a":{"requests":5,"windowMs":60000}}`。
 */
export function envModelRateLimit(
  key: string,
  fallback?: EnvRateLimitConfig,
): EnvRateLimitConfig | undefined {
  const v = process.env[key];
  if (v === undefined || v.trim() === '') {
    return fallback;
  }
  try {
    const parsed = JSON.parse(v) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return fallback;
    }
    const out: EnvRateLimitConfig = {};
    for (const [rawKey, rawValue] of Object.entries(parsed)) {
      const name = rawKey.trim();
      if (!name || !rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) continue;
      const cfg = rawValue as Record<string, unknown>;
      const requests = Number(cfg.requests);
      const windowMs = Number(cfg.windowMs);
      if (!Number.isFinite(requests) || requests < 1 || !Number.isFinite(windowMs) || windowMs < 1) continue;
      out[name] = {
        requests: Math.floor(requests),
        windowMs: Math.floor(windowMs),
      };
    }
    return Object.keys(out).length > 0 ? out : fallback;
  } catch {
    return fallback;
  }
}

/**
 * 流式请求超时（毫秒），用于 `streamText({ abortSignal })`。
 * 未设置或空字符串：使用 `fallback`；`0`：不启用超时（返回 `undefined`）；非法值回退 `fallback`。
 */
export function envStreamTimeoutMs(key: string, fallback: number | undefined): number | undefined {
  const v = process.env[key];
  if (v === undefined || v === '') {
    return fallback;
  }
  const parsed = Number.parseInt(v.trim(), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return fallback;
  }
  if (parsed === 0) {
    return undefined;
  }
  return parsed;
}

/**
 * 读取框架选择（Vue/Angular）。
 * @param key 环境变量名
 * @param fallback 默认框架
 * @returns 解析后的框架
 */
export function envFramework(key: string, fallback: 'Vue' | 'Angular' | undefined): 'Vue' | 'Angular' {
  const v = process.env[key];
  if (v === 'Angular' || v === 'Vue') {
    return v;
  }
  if (fallback === 'Angular' || fallback === 'Vue') {
    return fallback;
  }
  return 'Vue';
}

/**
 * 读取物料档位：`standard` → materialsMeta；`mini` → miniMaterialsMeta（Vue materials 包导出）。
 */
export function envMaterialsVariant(
  key: string,
  fallback: 'mini' | 'standard' | undefined,
): 'mini' | 'standard' {
  const v = process.env[key]?.trim().toLowerCase();
  if (v === 'mini' || v === 'standard') {
    return v;
  }
  if (fallback === 'mini' || fallback === 'standard') {
    return fallback;
  }
  return 'standard';
}

/**
 * 读取协议：`genui` | `a2ui`（大小写不敏感）。
 */
export function envBenchProtocol(
  key: string,
  fallback: 'genui' | 'a2ui' | undefined,
): 'genui' | 'a2ui' {
  const v = process.env[key]?.trim().toLowerCase();
  if (v === 'genui' || v === 'a2ui') {
    return v;
  }
  if (fallback === 'genui' || fallback === 'a2ui') {
    return fallback;
  }
  return 'genui';
}
