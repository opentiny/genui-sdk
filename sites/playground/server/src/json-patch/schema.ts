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
  "RFC 6901 Pointer (e.g., '/foo/0', '/a~1b'). Use '/-' as the last segment to append to an array.",
);

/** replace/copy/test 的 path 与 copy 的 from：必须指向已有位置，禁止 `-` 索引 */
const jsonPointerSchemaExisting = jsonPointerBaseSchema
  .refine(
    (s) => !jsonPointerHasAppendSentinel(s),
    'Invalid JSON Pointer: "-" (array append) is only valid for op "add". Use a numeric index or property name.',
  )
  .describe(
    "RFC 6901 Pointer to an existing value (e.g., '/foo/0', '/a~1b'). Do not use '/-' — that is only for op 'add'.",
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
 * JSON Patch 操作集：以 RFC 6902 为语法基础，并做 UI 组件树场景下的领域扩展。
 * 每条操作均带非标准的 `id`（RFC 6902 未定义），用于定位当前 schema 中的目标组件；
 * `move` 还使用 `positionId` / `position` 等与组件相对位置相关的语义。
 * 增加 .describe() 以优化 LLM 的 Function Calling 或 JSON 生成表现。
 */
const baseOperationSchema = z.object({
  id: z
    .string()
    .min(1)
    .describe(
      'Target component id in the current UI schema (domain extension; RFC 6902 operations do not include this field).',
    ),
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
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe('Removes the target component by id.');

// 替换
const replaceOperation = z
  .object({
    op: z.literal('replace'),
    path: jsonPointerSchemaExisting,
    value: jsonPatchValueSchema.describe('The new value to replace the current one.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe('Replaces the value at the target location with a new value.');

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

// 复制
const copyOperation = z
  .object({
    op: z.literal('copy'),
    from: jsonPointerSchemaExisting.describe('Reference to the location to copy the value from.'),
    path: jsonPointerSchemaExisting.describe('The destination path.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe("Copies a value from 'from' to 'path'.");

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
 * 最终导出的「JSON Patch 风格」操作 Schema（RFC 6902 基础 + 组件定向扩展）
 */
export const jsonPatchOperationSchema = z.discriminatedUnion('op', [
  addOperation,
  removeOperation,
  replaceOperation,
  moveOperation,
  copyOperation,
  testOperation,
]);

export const jsonPatchSchema = z
  .array(jsonPatchOperationSchema)
  .describe(
    'JSON Patch–style operations (based on RFC 6902), extended with component targeting (`id`, and move positioning) for UI schema manipulation; applied in order.',
  );

export type JsonPatchOperation = z.infer<typeof jsonPatchOperationSchema>;
export type JsonPatch = z.infer<typeof jsonPatchSchema>;
