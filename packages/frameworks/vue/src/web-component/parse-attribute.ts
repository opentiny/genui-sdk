export function parseJsonAttribute<T>(value: Record<string, unknown> | Array<unknown> | string | undefined): T | undefined {
  if (!value) return undefined;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function parseBooleanAttribute(value: boolean | string | undefined, defaultValue = false): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value !== 'false';
  return defaultValue;
}
