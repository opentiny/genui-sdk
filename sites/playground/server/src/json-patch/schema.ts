import { z } from 'zod';

/**
 * 领域扩展形态：LLM 用 `id` 锚定组件节点，`path` 为相对该节点的 RFC 6901 Pointer；
 * 运行时再合成绝对 path，落到标准 RFC 6902。
 */

/** 解码 JSON Pointer 各段（处理 ~0 / ~1） */
function decodePointerSegments(pointer: string): string[] {
  if (pointer === '') return [];
  return pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/** 是否存在 "-" 引用 token（JSON Patch add 的数组末尾 sentinel） */
function jsonPointerHasAppendSentinel(pointer: string): boolean {
  return decodePointerSegments(pointer).some((segment) => segment === '-');
}

/** "-" 出现在非末段（对 add 非法） */
function jsonPointerHasAppendSentinelNotOnlyAtEnd(pointer: string): boolean {
  const segments = decodePointerSegments(pointer);
  return segments.slice(0, -1).some((segment) => segment === '-');
}

/**
 * 相对 `id` 的 JSON Pointer：必须以 `/` 开头（不可为空；空 path 由「省略 path」表达，见 remove）
 */
const relativeJsonPointerBaseSchema = z
  .string()
  .regex(
    /^(?:\/(?:[^~/]|~[01])*)+$/,
    'Invalid relative JSON Pointer. Must start with "/" and use ~0, ~1 for escaping.',
  );

/** add：相对锚点；允许末段 `/-` 表示数组末尾追加 */
const relativeJsonPointerSchemaAdd = relativeJsonPointerBaseSchema
  .refine(
    (s) => !jsonPointerHasAppendSentinelNotOnlyAtEnd(s),
    'Invalid JSON Pointer: "-" (array append) is only valid as the last segment for op "add".',
  )
  .describe(
    "Pointer relative to anchor component `id` (e.g. '/children/0', '/props/items/-'). Use '/-' as the last segment to append to an array. Do not traverse other components via '/children/.../props'.",
  );

/** replace：相对目标节点；必须指向已有位置，禁止 `-` */
const relativeJsonPointerSchemaExisting = relativeJsonPointerBaseSchema
  .refine(
    (s) => !jsonPointerHasAppendSentinel(s),
    'Invalid JSON Pointer: "-" (array append) is only valid for op "add". Use a numeric index or property name.',
  )
  .describe(
    "Pointer relative to component `id` (e.g. '/props/text'). Do not use '/-' — that is only for op 'add'.",
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
 * JSON Patch 操作集：RFC 6902 语法 + 组件 id 定位扩展。
 * copy 与 move 同形（整节点 + positionId/position）；不包含 test。
 */
const addOperation = z
  .object({
    op: z.literal('add'),
    id: z
      .string()
      .min(1)
      .describe(
        'Anchor component id: parent when inserting into /children; the node itself when adding under /props. `path` is relative to this node — do not use an ancestor id with /children/.../props.',
      ),
    path: relativeJsonPointerSchemaAdd,
    value: jsonPatchValueSchema.describe('The value to add at the specified relative path.'),
  })
  .strict()
  .describe(
    'Adds a value under the component identified by `id` (relative `path`). For child props, use the child node id + /props/..., not parent + /children/n/props.',
  );

const removeOperation = z
  .object({
    op: z.literal('remove'),
    id: z
      .string()
      .min(1)
      .describe('Component id to remove (the node itself; no path).'),
  })
  .strict()
  .describe('Removes the target component by id. Runtime path = id location.');

const replaceOperation = z
  .object({
    op: z.literal('replace'),
    id: z
      .string()
      .min(1)
      .describe('Component id whose relative `path` value is replaced.'),
    path: relativeJsonPointerSchemaExisting,
    value: jsonPatchValueSchema.describe('The new value to replace the current one.'),
  })
  .strict()
  .describe('Replaces a value at `path` relative to component `id`.');

const movePositionSchema = z
  .enum(['before', 'after', 'inside'])
  .describe('Relative insertion position to positionId.');

const moveOperation = z
  .object({
    op: z.literal('move'),
    id: z
      .string()
      .min(1)
      .describe('Component id of the node being moved (source).'),
    positionId: z
      .string()
      .min(1)
      .describe('Anchor component id used as move destination reference (must differ from `id`).'),
    position: movePositionSchema,
  })
  .strict()
  .describe(
    "Moves component `id` relative to `positionId` by `position`. Runtime derives standard from/path; do not send from/path.",
  );

const copyOperation = z
  .object({
    op: z.literal('copy'),
    id: z
      .string()
      .min(1)
      .describe('Component id of the node being copied (whole subtree).'),
    positionId: z
      .string()
      .min(1)
      .describe('Anchor component id used as copy destination reference (must differ from `id`).'),
    position: movePositionSchema,
  })
  .strict()
  .describe(
    "Copies component `id` relative to `positionId` by `position` (same positioning as move). Runtime derives standard from/path and regenerates ids on the clone; do not send from/path.",
  );

/**
 * 最终导出的「JSON Patch 风格」操作 Schema（RFC 6902 基础 + 组件定向扩展）
 * move/copy 的 id≠positionId 放在 union 上校验（discriminatedUnion 成员不能是 ZodEffects）
 */
export const jsonPatchOperationSchema = z
  .discriminatedUnion('op', [
    addOperation,
    removeOperation,
    replaceOperation,
    moveOperation,
    copyOperation,
  ])
  .superRefine((op, ctx) => {
    if ((op.op === 'move' || op.op === 'copy') && op.id === op.positionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          '`id` and `positionId` must differ; positionId is the destination anchor, not the source node.',
        path: ['positionId'],
      });
    }
  });

export const jsonPatchSchema = z
  .array(jsonPatchOperationSchema)
  .describe(
    'JSON Patch–style operations (RFC 6902 + component `id` targeting). Each op uses `id` (and move/copy positioning); runtime expands to absolute paths. Applied in order.',
  );

export type JsonPatchOperation = z.infer<typeof jsonPatchOperationSchema>;
export type JsonPatch = z.infer<typeof jsonPatchSchema>;
