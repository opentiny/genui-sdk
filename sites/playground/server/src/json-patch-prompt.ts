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

// 复制
const copyOperation = z
  .object({
    op: z.literal('copy'),
    from: jsonPointerSchemaExisting.describe('Reference to the location to copy the value from.'),
    path: jsonPointerSchemaExisting.describe('The destination path.'),
  })
  .extend(baseOperationSchema.shape)
  .strict()
  .describe("Copies the value at `from` to `path`, both relative to `id`.");

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
  .describe(
    'JSON Patch operations applied in order. `id` only makes `path` / `from` relative to a component; it does not change the operation meaning.',
  );

export type JsonPatchOperation = z.infer<typeof jsonPatchOperationSchema>;
export type JsonPatch = z.infer<typeof jsonPatchSchema>;

const jsonPatchSchemaAsJsonSchema = zodToJsonSchema(jsonPatchSchema, {
  name: 'JsonPatchOperations',
});
const jsonPatchSchemaText = JSON.stringify(jsonPatchSchemaAsJsonSchema, null, 2);

export const generateJsonPatchPrompt =
  () => `根据提供的 JSON schema 和修改指令，生成符合基于 JSON PATCH (RFC 6902) 规范扩展的 JSON PATCH 操作序列，使用 \`\`\`jsonPatch\`\`\` 标记包裹输出。

## JSON PATCH 格式规范（由 jsonPatchSchema 转换）

请严格按以下 JSON Schema 生成操作序列：顶层必须是 JSON 数组（\`[]\`），按顺序包含零条或多条操作对象；不要只输出单条操作对象。

\`\`\`json
${jsonPatchSchemaText}
\`\`\`

## ⚠️ 最重要：ID 来源规则（必须严格遵守）

**当前 schema 是组件 ID 的唯一可信来源！**

1. **完全忽略历史消息中的任何 ID**：历史消息中的组件 ID 可能已经过期或无效，绝对不要使用
2. **只使用当前 schema 中的 ID**：所有组件 ID 必须从下面提供的当前 schema 中查找和验证
3. **如果历史消息中的 ID 与当前 schema 不匹配**：说明 schema 已经更新，必须使用当前 schema 中的新 ID
4. **验证 ID 存在性**：在使用任何 ID 前，必须确认该 ID 在当前 schema 中存在

**重要提醒：**
- 历史消息中的 ID 可能指向已删除或已修改的组件
- 历史消息中的 ID 可能与当前 schema 中的组件不匹配
- 必须通过内容匹配（componentName、props.text 等）在当前 schema 中找到对应的组件，然后使用该组件在当前 schema 中的实际 ID
- 不要假设历史消息中的 ID 仍然有效

## ⚠️ 核心规则（必须严格遵守）

### 1. 验证步骤（必须严格执行）

**在生成任何操作前，必须先完成验证：**
- 通过内容匹配（componentName、props.text 等）找到目标组件本身的 id
- 验证 id 在 schema 中存在且匹配预期
- 验证路径在组件内部有效
- **验证失败则输出空数组 \`[]\`，不要猜测**

### 2. 组件 id 规则（基于 RFC 6902 扩展）

**remove/replace 操作：必须使用目标组件本身的 id，禁止使用父组件 id + path**
- ✅ 正确：删除 children[1] → 找到 children[1] 本身的 id，使用 \`{ "op": "remove", "id": "child123" }\`
- ❌ 禁止：\`{ "op": "remove", "id": "parent123", "path": "/children/1" }\`

**add 操作：使用父组件 id + path 指定位置**
- ✅ 正确：\`{ "op": "add", "id": "parent123", "path": "/children/0", "value": {...} }\`

**move 操作: id 指定被移动的对象； positionId 指定要移动到的目标位置是基于哪个对象， position 可以为 before, after, inside， 指定相对位置**
**before 和 after 和 inside 的区别：**
- before：移动到目标对象的前面
- inside：移动到目标对象的内部
- 如果要移动到一个元素的后面，清使用下一个元素的前面，或者父元素的里面
- after：移动到目标对象的后面
**示例：**
- ✅ 正确：\`{ "op": "move", "id": "targetId", "positionId": "anchorId", "position": "before" }\`
- ✅ 正确：\`{ "op": "move", "id": "targetId", "positionId": "anchorId", "position": "inside" }\`
- ✅ 正确：\`{ "op": "move", "id": "targetId", "positionId": "anchorId", "position": "after" }\`

**属性操作：使用目标组件本身的 id + 组件内相对路径**
- ✅ 正确：修改 children[0].children[0].props.text → 找到该组件本身的 id，使用 \`{ "id": "deep123", "path": "/props/text" }\`
- ❌ 错误：\`{ "id": "parent123", "path": "/children/0/children/0/props/text" }\`

### 3. 路径变化处理（⚠️ 关键）

**操作按顺序执行，每个操作都基于前一个操作应用后的 schema 状态：**
- 不能使用初始 schema 的路径作为基准
- 必须模拟前面操作的应用，然后计算后续操作的路径
- 每个操作的路径都是基于前面所有操作已应用后的状态

**路径变化规则：**
- remove：删除索引 N 后，后续索引自动减 1
- add：在索引 N 插入后，原索引 >= N 的元素索引加 1

**示例：**
\`\`\`
初始状态：children = [A(id:1), B(id:2), C(id:3), D(id:4)]
需要删除：children[1] (B) 和 children[3] (D)

❌ 错误方式（使用初始路径）：
[
  {"op": "remove", "id": "comp123", "path": "/children/1"},  // 删除 B
  {"op": "remove", "id": "comp123", "path": "/children/3"}   // 错误！删除 B 后，D 的索引变成 2
]

✅ 正确方式（基于前面操作应用后的状态）：
[
  {"op": "remove", "id": "comp123", "path": "/children/1"},  // 删除 B，此时 children = [A, C, D]
  {"op": "remove", "id": "comp123", "path": "/children/2"}   // 基于新状态，D 的索引是 2
]

✅ 更好的方式（从后往前删除，避免索引变化）：
[
  {"op": "remove", "id": "comp123", "path": "/children/3"},  // 删除 D
  {"op": "remove", "id": "comp123", "path": "/children/1"}   // 删除 B（索引不变）
]

move 示例（相对位置语义）：
初始状态：children = [A(id:a), B(id:b), C(id:c), D(id:d)]
目标：把 D 移动到 B 前面，期望结果 [A, D, B, C]

❌ 错误方式（把 positionId 误用成被移动元素自身）：
[
  {"op": "move", "id": "d", "positionId": "d", "position": "before"}
]

✅ 正确方式（positionId 指向目标锚点 B）：
[
  {"op": "move", "id": "d", "positionId": "b", "position": "before"}
]
\`\`\`

### Schema 使用补充

- 所有 \`path\` / \`from\` 字段都必须遵循 RFC 6901 JSON Pointer
- \`path\` 支持数组末尾写法 \`/-\`（仅在 add 到数组末尾时使用）
- \`move\` 操作使用 \`positionId + position(before/after/inside)\`，不使用 \`from/path\`
- 组件编辑语义（id、positionId、position 等）必须同时满足本提示词上文的业务规则

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

**记住：**
1. 先验证组件 id，再验证相对路径，最后生成操作
2. **路径必须基于前面操作已应用后的状态，不能使用初始 schema 的路径**
3. 每个操作前都要模拟前面所有操作的应用，验证路径在当时的 schema 状态下有效
4. 最后生成的 jsonPatch 应用后的 json 必须符合 schemaJSON 的格式
`;

