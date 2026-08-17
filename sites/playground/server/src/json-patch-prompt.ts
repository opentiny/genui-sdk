import { zodToJsonSchema } from 'zod-to-json-schema';
import { jsonPatchSchema } from './json-patch/schema.js';

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
| add | id, path, value | id 为父组件 id，path 为相对父组件的插入位置 |
| remove | id | 只需目标组件 id，无需 path |
| replace | id, path, value | id 为目标组件 id，path 为组件内部的属性路径（如 /props/text） |
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

## 路径说明

除 \`add\` 外，操作的定位由系统按 \`id\` 自动推导，无需你计算索引或绝对路径：

- \`remove\`：只给 \`id\`，系统按 id 定位目标组件
- \`replace\`：\`id\` 定位组件，\`path\` 是组件内部的相对属性路径（如 \`/props/text\`）
- \`move\`：\`id\` 定位被移动组件，\`positionId\` + \`position\` 定位目标位置

只有 \`add\` 需要给出相对父组件的插入路径；当连续向同一数组插入多个元素时，后续操作的索引要基于已插入后的状态计算：

\`\`\`
父组件 children 初始：[A, B, C]
目标：在开头依次插入 x、y 两个子组件
[
  {"op": "add", "id": "parent", "path": "/children/0", "value": {"componentName": "Text", "props": {"text": "x"}}},
  {"op": "add", "id": "parent", "path": "/children/1", "value": {"componentName": "Text", "props": {"text": "y"}}}
]
// 第一次 add 后 children = [x, A, B, C]，因此第二次插入开头需使用索引 1
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
