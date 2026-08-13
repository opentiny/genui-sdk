import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

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
 * 最终导出的 JSON Patch Schema
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
  .describe('An array of JSON Patch operations (RFC 6902) to be applied in order.');

export type JsonPatchOperation = z.infer<typeof jsonPatchOperationSchema>;
export type JsonPatch = z.infer<typeof jsonPatchSchema>;

const jsonPatchSchemaAsJsonSchema = zodToJsonSchema(jsonPatchSchema, {
  name: 'JsonPatchOperations',
});
const jsonPatchSchemaText = JSON.stringify(jsonPatchSchemaAsJsonSchema, null, 2);

export const generateJsonPatchPrompt =
  () => `根据提供的 JSON schema 和修改指令，生成符合 JSON PATCH (RFC 6902) 规范扩展的操作序列，使用 \`\`\`jsonPatch\`\`\` 标记包裹输出。

## JSON PATCH 格式规范

请严格按以下 JSON Schema 生成操作序列：

\`\`\`json
${jsonPatchSchemaText}
\`\`\`

## ID 规则

**当前 schema 是 ID 的唯一来源**。所有操作中的 id 必须从当前提供的 schema 中查找。历史消息中的 id 可能已过期，不要使用。

通过组件的 \`componentName\`、\`props.text\` 等内容特征在当前 schema 中查找对应组件，获取其当前 id。

## 操作字段说明

| 操作 | 必填字段 | 说明 |
|------|---------|------|
| add | id, path, value | id 为父组件 id，path 指定插入位置 |
| remove | id | 只需目标组件 id，无需 path |
| replace | id, path, value | id 为目标组件 id，path 指定组件内属性路径 |
| move | id, positionId, position | id 为被移动组件，positionId 为锚点，position 为相对位置 |

### move 操作

position 取值：
- \`before\`：移动到 positionId 元素的前面
- \`after\`：移动到 positionId 元素的后面
- \`inside\`：移动到 positionId 元素的内部（作为其最后一个子节点）

示例：
\`\`\`
初始：[A(id:a), B(id:b), C(id:c), D(id:d)]
操作：{"op": "move", "id": "d", "positionId": "b", "position": "before"}
结果：[A, D, B, C]
\`\`\`

## 路径计算

操作按顺序执行，每个操作基于前一个操作应用后的状态：

- remove：删除索引 N 后，后续索引自动减 1
- add：在索引 N 插入后，原索引 >= N 的元素索引加 1

示例：
\`\`\`
初始：children = [A(id:a), B(id:b), C(id:c), D(id:d)]
目标：删除 B 和 D

✅ 正确方式：
[
  {"op": "remove", "id": "b"},  // 删除 B，此时 children = [A, C, D]
  {"op": "remove", "id": "d"}   // 删除 D（此时 D 的索引是 2）
]

✅ 更优方式（从后往前删除，避免索引变化）：
[
  {"op": "remove", "id": "d"},  // 先删除 D
  {"op": "remove", "id": "b"}   // 再删除 B（索引不变）
]
\`\`\`

## 验证策略

生成操作序列后，按以下顺序自查：
1. 每个 id 在当前 schema 中是否存在？
2. 每个 path 在当前操作应用后的 schema 状态下是否有效？
3. 如果有错误，修正后重新检查。

验证不通过则输出 \`[]\`。

## 输出格式

\`\`\`jsonPatch
[
  {
    "op": "replace",
    "id": "comp12345",
    "path": "/props/text",
    "value": "新文本"
  },
  {
    "op": "remove",
    "id": "comp67890"
  }
]
\`\`\`
`;
