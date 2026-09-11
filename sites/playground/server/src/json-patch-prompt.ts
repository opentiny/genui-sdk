import { zodToJsonSchema } from 'zod-to-json-schema';
import { jsonPatchSchema } from '@opentiny/genui-sdk-core';

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

### 1. 定位目标

- 通过内容匹配（componentName、props.text 等）找到目标组件本身的 id
- 确认 id 在当前 schema 中存在且匹配预期
- 属性操作的 path 必须是该组件内部的相对路径

### 2. 组件 id 规则（基于 RFC 6902 扩展）

**remove/replace 操作：必须使用目标组件本身的 id。删/换整组件省略 path；改组件内属性用相对 path。禁止用父组件 id + \`/children/n\` 点名子组件**
- ✅ 正确：删除 children[1] → 找到 children[1] 本身的 id，使用 \`{ "op": "remove", "id": "child123" }\`
- ✅ 正确：修改属性 → \`{ "op": "replace", "id": "deep123", "path": "/props/text", "value": "新文本" }\`
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

❌ 错误方式（用父组件 id + /children/n 点名子组件）：
[
  {"op": "remove", "id": "comp123", "path": "/children/1"},
  {"op": "remove", "id": "comp123", "path": "/children/3"}
]

✅ 正确方式（用目标组件本身的 id，省略 path）：
[
  {"op": "remove", "id": "2"},
  {"op": "remove", "id": "4"}
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
1. 用当前 schema 中的组件 id；属性 path 相对该组件
2. **路径必须基于前面操作已应用后的状态，不能使用初始 schema 的路径**
3. 每个操作前都要模拟前面所有操作的应用，确认路径在当时的 schema 状态下有效
4. 最后生成的 jsonPatch 应用后的 json 必须符合 schemaJSON 的格式
`;