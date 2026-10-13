import type { ISchemaVersionHistoryEntry } from './schema-version-history';
import { parseSchemaJson, rebuildSchemaFromCard } from './conversation-schema';

function stripNullPlaceholders(value: unknown): unknown {
  if (value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => stripNullPlaceholders(item))
      .filter((item) => item !== undefined);
  }
  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === null) {
        continue;
      }
      const cleaned = stripNullPlaceholders(val);
      if (cleaned !== undefined) {
        result[key] = cleaned;
      }
    }
    return result;
  }
  return value;
}

function stringifySchemaForDiff(value: unknown): string {
  const cleaned = stripNullPlaceholders(value);
  if (cleaned === undefined) {
    return '{}';
  }
  return JSON.stringify(cleaned, null, 2);
}

export function resolveSchemaVersionDiffOriginal(
  entry: ISchemaVersionHistoryEntry,
  entries: ISchemaVersionHistoryEntry[],
): string {
  const card = entry.cardMessage;

  if (card.prevSchema?.trim()) {
    const parsed = parseSchemaJson(card.prevSchema);
    if (parsed) {
      return stringifySchemaForDiff(parsed);
    }
  }

  const sorted = [...entries].sort((a, b) => a.createdAtMs - b.createdAtMs);
  const index = sorted.findIndex((item) => item.cardId === entry.cardId);
  if (index > 0) {
    const prevSchema = rebuildSchemaFromCard(sorted[index - 1].cardMessage);
    if (prevSchema) {
      return stringifySchemaForDiff(prevSchema);
    }
  }

  return '{}';
}

export function resolveSchemaVersionDiffModified(entry: ISchemaVersionHistoryEntry): string {
  const schema = rebuildSchemaFromCard(entry.cardMessage);
  if (schema) {
    return stringifySchemaForDiff(schema);
  }

  if (entry.cardMessage.schema?.trim()) {
    const parsed = parseSchemaJson(entry.cardMessage.schema);
    if (parsed) {
      return stringifySchemaForDiff(parsed);
    }
    return entry.cardMessage.schema;
  }

  return '{}';
}

export function hasUnifiedDiffChanges(original: string, modified: string): boolean {
  return original !== modified;
}
