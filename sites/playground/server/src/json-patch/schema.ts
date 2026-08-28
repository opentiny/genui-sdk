import { z } from 'zod';
import { genNodeSchema } from '@opentiny/genui-sdk-core';

/**
 * 领域扩展形态：LLM 用 `id` 锚定组件节点，`path` 为相对该节点的 RFC 6901 Pointer；
 * 运行时再合成绝对 path，落到标准 RFC 6902。
 */

/** 解码 JSON Pointer 各段（处理 ~0 / ~1）；相对 path 校验不接受根 pointer `/`。 */
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

/** 是否是向当前锚点 children 数组插入一个完整组件节点 */
function isDirectChildrenInsertionPointer(pointer: string): boolean {
  const segments = decodePointerSegments(pointer);
  return segments.length === 2 && segments[0] === 'children' && (segments[1] === '-' || /^\d+$/.test(segments[1]));
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
  .describe("Pointer relative to component `id` (e.g. '/props/text'). Do not use '/-' — that is only for op 'add'.");

/**
 * 递归 JSON 值定义
 */
const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type JsonValue = z.infer<typeof literalSchema> | { [key: string]: JsonValue } | JsonValue[];
const jsonPatchValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([literalSchema, z.array(jsonPatchValueSchema), z.record(jsonPatchValueSchema)]),
);

const directChildrenInsertionPointerSchema = z
  .string()
  .regex(
    /^\/children\/(?:\d+|-)$/,
    'Path must be /children/<index> or /children/- when adding a child component.',
  )
  .describe('Direct children insertion path: /children/<index> or /children/-.');

const nonChildrenInsertionPointerSchema = relativeJsonPointerSchemaAdd
  .refine(
    (s) => !isDirectChildrenInsertionPointer(s),
    'Use a complete component node value when adding to /children/<index> or /children/-.',
  )
  .describe('Relative path for adding a non-component value, such as /props/name or /props/items/-.');

const addOperationBase = z.object({
  op: z.literal('add'),
  id: z
    .string()
    .min(1)
    .describe(
      'Anchor component id: parent when inserting into /children; the node itself when adding under /props. `path` is relative to this node — do not use an ancestor id with /children/.../props.',
    ),
});

/**
 * JSON Patch 操作集：RFC 6902 语法 + 组件 id 定位扩展。
 * copy 与 move 同形（整节点 + positionId/position）；不包含 test。
 */
const createAddOperation = (componentNodeValueSchema: z.ZodTypeAny) => {
  const addChildOperation = addOperationBase
    .extend({
      path: directChildrenInsertionPointerSchema,
      value: componentNodeValueSchema.describe(
        'Complete schema component node to insert. Must include componentName and id.',
      ),
    })
    .strict()
    .describe('Adds a complete component node into the anchor component children array.');

  const addValueOperation = addOperationBase
    .extend({
      path: nonChildrenInsertionPointerSchema,
      value: jsonPatchValueSchema.describe('The non-component value to add at the specified relative path.'),
    })
    .strict()
    .describe('Adds a non-component value under the anchor component, such as props or data.');

  return z
    .union([addChildOperation, addValueOperation])
    .describe(
      'Adds a value under the component identified by `id` (relative `path`). For child props, use the child node id + /props/..., not parent + /children/n/props.',
    );
};

const removeOperation = z
  .object({
    op: z.literal('remove'),
    id: z.string().min(1).describe('Component id of the target node.'),
    path: relativeJsonPointerSchemaExisting
      .optional()
      .describe(
        'Optional relative path. If omitted, removes the whole node; if provided, removes the value at the specified path (e.g. a prop).',
      ),
  })
  .strict()
  .describe('Removes the target component (no `path`) or a specific property/array item under it (with `path`).');

const replaceOperationBase = z.object({
  op: z.literal('replace'),
  id: z.string().min(1).describe('Component id of the target node.'),
});

const createReplaceOperation = (componentNodeValueSchema: z.ZodTypeAny) => {
  const replaceNodeOperation = replaceOperationBase
    .extend({
      value: componentNodeValueSchema.describe(
        'Complete schema component node used to replace the target node. Must include componentName and id.',
      ),
    })
    .strict()
    .describe('Replaces the whole target component node. Do not include `path`.');

  const replaceValueOperation = replaceOperationBase
    .extend({
      path: relativeJsonPointerSchemaExisting.describe(
        'Relative path to an existing value under the target component, such as /props/text.',
      ),
      value: jsonPatchValueSchema.describe('The new non-component value.'),
    })
    .strict()
    .describe('Replaces a specific property, array item, or other value under the target component.');

  return z
    .union([replaceNodeOperation, replaceValueOperation])
    .describe('Replaces the target node (no `path`) or a specific property/array item under it (with `path`).');
};

const movePositionSchema = z.enum(['before', 'after', 'inside']).describe('Relative insertion position to positionId.');

const moveOperation = z
  .object({
    op: z.literal('move'),
    id: z.string().min(1).describe('Component id of the node being moved (source).'),
    positionId: z
      .string()
      .min(1)
      .describe('Anchor component id used as move destination reference (must differ from `id`).'),
    position: movePositionSchema,
  })
  .strict()
  .refine((operation) => operation.id !== operation.positionId, {
    message: '`id` and `positionId` must differ for move.',
    path: ['positionId'],
  })
  .describe(
    'Moves component `id` relative to `positionId` by `position`. Runtime derives standard from/path; do not send from/path.',
  );

const copyOperation = z
  .object({
    op: z.literal('copy'),
    id: z.string().min(1).describe('Component id of the node being copied (whole subtree).'),
    positionId: z
      .string()
      .min(1)
      .describe('Anchor component id used as copy destination reference (must differ from `id`).'),
    position: movePositionSchema,
  })
  .strict()
  .refine((operation) => operation.id !== operation.positionId, {
    message: '`id` and `positionId` must differ for copy.',
    path: ['positionId'],
  })
  .describe(
    'Copies component `id` relative to `positionId` by `position` (same positioning as move). Runtime derives standard from/path and regenerates ids on the clone; do not send from/path.',
  );

/**
 * 最终导出的「JSON Patch 风格」操作 Schema（RFC 6902 基础 + 组件定向扩展）。
 * 只接收组件白名单，不依赖 playground 配置，便于后续移动到 core 包。
 */
export const genJsonPatchOperationSchema = (componentWhiteList?: string[]) => {
  const componentNodeValueSchema = genNodeSchema(componentWhiteList)
    .and(z.object({ id: z.string().min(1).describe('Required component id for patch targeting.') }))
    .describe('Complete component node value. Used when adding to /children/<index|-> or replacing a whole node.');

  return z.union([
    createAddOperation(componentNodeValueSchema),
    removeOperation,
    createReplaceOperation(componentNodeValueSchema),
    moveOperation,
    copyOperation,
  ]);
};

export const genJsonPatchSchema = (componentWhiteList?: string[]) =>
  z
    .array(genJsonPatchOperationSchema(componentWhiteList))
    .describe(
      'JSON Patch–style operations (RFC 6902 + component `id` targeting). Each op uses `id` (and move/copy positioning); runtime expands to absolute paths. Applied in order.',
    );

export const jsonPatchOperationSchema = genJsonPatchOperationSchema();

export const jsonPatchSchema = genJsonPatchSchema();

export type JsonPatchOperation = z.infer<typeof jsonPatchOperationSchema>;
export type JsonPatch = z.infer<typeof jsonPatchSchema>;
