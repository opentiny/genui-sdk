export function jsonAttribute(value: unknown): any {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'string') return value;
  if (!value.trim()) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}
