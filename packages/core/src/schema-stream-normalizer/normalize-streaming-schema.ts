/**
 * 流式输出期间将 schema 中的 lifeCycles 归一化为空对象，
 * 避免未闭合的 lifecycle 配置触发渲染；schema-json 完整解析后再应用真实值。
 */
export function normalizeStreamingSchema<T extends Record<string, unknown>>(
  schema: T,
  isCompleted: boolean,
): T {
  if (isCompleted || !schema || typeof schema !== 'object') {
    return schema;
  }

  if (!Object.prototype.hasOwnProperty.call(schema, 'lifeCycles')) {
    return schema;
  }

  return {
    ...schema,
    lifeCycles: {},
  };
}
