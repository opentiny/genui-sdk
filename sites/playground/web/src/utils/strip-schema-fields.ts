/** 流式未完成时默认从 schema 中剥离的顶层字段 */
export const STREAMING_DEFERRED_SCHEMA_FIELDS = ['lifeCycles'] as const;

export type StreamingDeferredSchemaField = (typeof STREAMING_DEFERRED_SCHEMA_FIELDS)[number];

/**
 * 流式未完成时从 schema 快照中移除指定顶层字段，避免未写完的配置被提前渲染/执行。
 */
export function stripSchemaFieldsWhileStreaming<T extends Record<string, unknown>>(
  schema: T,
  streamComplete: boolean,
  fields: readonly string[] = STREAMING_DEFERRED_SCHEMA_FIELDS,
): T {
  if (streamComplete || !schema || typeof schema !== 'object' || fields.length === 0) {
    return schema;
  }

  const next = { ...schema };
  let changed = false;
  for (const field of fields) {
    if (field in next) {
      delete next[field];
      changed = true;
    }
  }
  return changed ? (next as T) : schema;
}
