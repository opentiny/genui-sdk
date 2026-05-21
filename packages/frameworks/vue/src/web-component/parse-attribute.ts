export function parseJsonAttribute<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;
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
