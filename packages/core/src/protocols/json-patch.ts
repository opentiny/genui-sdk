import { z } from 'zod';

/**
 * RFC 6901 JSON Pointer 校验
 * 精确匹配：必须为空或以 / 开头，且 ~ 后面必须跟着 0 或 1
 */
const jsonPointerBaseSchema = z
  .string()
  .regex(
    /^(?:|(?:\/(?:[^~/]|~[01])*)+)$/,
    'Invalid JSON Pointer format. Must start with "/" and use ~0, ~1 for escaping.',
  );

/** 是否存在 "-" 引用 token（JSON Patch add 的数组末尾 sentinel；replace/copy/test 不允许） */
function jsonPointerHasAppendSentinel(pointer: string): boolean {
  if (pointer === '') return false;
  return pointer
    .slice(1)
    .split('/')
    .some((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~') === '-');
}

/** add 的 path：允许 `/-` 表示插入数组末尾 */
const jsonPointerSchemaAdd = jsonPointerBaseSchema.describe(
  "JSON Pointer relative to id (e.g., '/props/text', '/children/0'). Use '/-' as the last segment to append to an array.",
);

/** replace/copy/test 的 path 与 copy 的 from：必须指向已有位置，禁止 `-` 索引 */
const jsonPointerSchemaExisting = jsonPointerBaseSchema
  .refine(
    (s) => !jsonPointerHasAppendSentinel(s),
    'Invalid JSON Pointer: "-" (array append) is only valid for op "add". Use a numeric index or property name.',
  )
  .describe(
    "JSON Pointer relative to id to an existing location (e.g., '/props/text', '/children/0'). Do not use '/-' — that is only for op 'add'.",
  );

/**
 * 递归 JSON 值定义
 */
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type JsonValue = z.infer<typeof literalSchema> | { [key: string]: JsonValue } | JsonValue[];
const jsonPatchValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonPatchValueSchema), z.record(jsonPatchValueSchema)]),
);

/**
 * RFC 6902 JSON Patch 操作集
 * 增加 .describe() 以优化 LLM 的 Function Calling 或 JSON 生成表现
 */
const baseOperationSchema = z.object({
  id: z.string().min(1).describe('Target component id in current schema.'),
});

const movePositionSchema = z
  .enum(['before', 'after', 'inside'])
  .describe('Relative insertion position to positionId.');

// 添加
const addOperation = z
  .object({
    op: z.literal('add'),
    path: jsonPointerSchemaAdd,
    value: jsonPatchValueSchema.describe('The value to add at the specified path.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe('Adds a value to an object or inserts it into an array.');

// 移除
const removeOperation = z
  .object({
    op: z.literal('remove'),
    path: jsonPointerSchemaExisting
      .optional()
      .describe(
        'JSON Pointer relative to id. Empty or omitted names the component itself.',
      ),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe(
    'Removes the location identified by id and path. Omit path to remove the component itself.',
  );

// 替换
const replaceOperation = z
  .object({
    op: z.literal('replace'),
    path: jsonPointerSchemaExisting
      .optional()
      .describe(
        'JSON Pointer relative to id. Empty or omitted names the component itself.',
      ),
    value: jsonPatchValueSchema.describe('The new value to replace the current one.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe(
    'Replaces the location identified by id and path with `value`. Omit path to replace the component itself.',
  );

// 移动
const moveOperation = z
  .object({
    op: z.literal('move'),
    positionId: z.string().min(1).describe('Anchor component id used as move destination reference.'),
    position: movePositionSchema,
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe("Moves component `id` relative to `positionId` by `position`.");

// 测试
const testOperation = z
  .object({
    op: z.literal('test'),
    path: jsonPointerSchemaExisting,
    value: jsonPatchValueSchema.describe('The value to compare against.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe('Tests that a value at the target location is equal to a specified value.');

/**
 * 最终导出的 JSON Patch Schema
 */
export const jsonPatchOperationSchema = z.discriminatedUnion('op', [
  addOperation,
  removeOperation,
  replaceOperation,
  moveOperation,
  // copyOperation, // TODO 需要重新设计
  testOperation,
]);

export const jsonPatchSchema = z
  .array(jsonPatchOperationSchema)
  .describe(
    'JSON Patch operations applied in order. `id` only makes `path` / `from` relative to a component; it does not change the operation meaning.',
  );

export type JsonPatchOperation = z.infer<typeof jsonPatchOperationSchema>;
export type JsonPatch = z.infer<typeof jsonPatchSchema>;