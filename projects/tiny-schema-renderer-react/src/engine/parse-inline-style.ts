import type { CSSProperties } from 'react';

export function parseInlineStyle(style: string): CSSProperties {
  const result: Record<string, string> = {};
  style.split(';').forEach((part) => {
    const colon = part.indexOf(':');
    if (colon === -1) return;
    const key = part.slice(0, colon).trim();
    const val = part.slice(colon + 1).trim();
    if (key && val) {
      const camel = key.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
      result[camel] = val;
    }
  });
  return result as CSSProperties;
}

export function normalizeDomProps(props: Record<string, unknown>): Record<string, unknown> {
  const next = { ...props };
  if (typeof next.style === 'string') {
    next.style = parseInlineStyle(next.style);
  }
  if (next.class != null && next.className == null) {
    next.className = next.class;
  }
  delete next.class;
  return next;
}
