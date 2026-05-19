/**
 * 每个环境变量名单独维护轮换游标（同一 env 下配置的多个 key 共享一个池）。
 */
const rotationIndexByEnv = new Map<string, number>();

/**
 * 从环境变量原始字符串中取出本次请求应使用的 API Key。
 * 支持英文逗号分隔的多个 key，按请求顺序轮询，便于聚合多账号配额。
 */
export function pickNextApiKeyFromEnv(apiKeyEnvName: string | undefined, envValue: string | undefined): string | undefined {
  if (envValue === undefined) {
    return undefined;
  }

  if (!apiKeyEnvName) {
    return envValue;
  }
  const trimmed = envValue.trim();
  if (!trimmed) {
    return undefined;
  }

  const keys = trimmed
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
  if (keys.length === 0) {
    return undefined;
  }
  if (keys.length === 1) {
    return keys[0];
  }

  const poolKey = apiKeyEnvName;
  const prev = rotationIndexByEnv.get(poolKey) ?? 0;
  const picked = keys[prev % keys.length];
  rotationIndexByEnv.set(poolKey, (prev + 1) % keys.length);
  return picked;
}
