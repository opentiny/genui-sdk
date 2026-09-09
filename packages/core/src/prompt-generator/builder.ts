import type { ZodTypeAny } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { jsonPatchSchema } from '../json-patch';

export type IBuilderPromptValidationLevel = 'standard' | 'strict';

export interface IGenBuilderPromptOptions {
  includePatchSchema?: boolean;
  includeExamples?: boolean;
  includeBaseRules?: boolean;
  validationLevel?: IBuilderPromptValidationLevel;
  rules?: string[];
  isSkill?: boolean;
  wrapperComponent?: string;
}

export const builderPromptPrefix = `# 任务说明

根据用户的修改要求编辑当前 schemaJSON。当前 schemaJSON 会随用户消息提供，它是定位已有组件和引用 ID 的唯一可信来源。

不要重新生成完整 schemaJSON；只生成描述本次修改的 JSON Patch 操作。`;

export function genJsonPatchSchemaPrompt() {
  const schemaForConversion: ZodTypeAny = jsonPatchSchema;
  // Recursive JSON values exceed TypeScript's instantiation depth at this conversion boundary.
  // @ts-ignore
  const schema = zodToJsonSchema(schemaForConversion, { name: 'JsonPatchOperations' });
  return `## JSON Patch 格式

JSON Patch 以 RFC 6902 为语法基础，并使用组件 \`id\`、\`positionId\` 和 \`position\` 扩展组件树编辑语义。

请严格按照下面的 JSON Schema 生成顶层数组：

\`\`\`json
${JSON.stringify(schema, null, 2)}
\`\`\``;
}

function formatRules(rules: string[]) {
  return rules.map((rule) => (rule.startsWith('- ') ? rule : `- ${rule}`));
}

export function genBuilderRulesPrompt(options: IGenBuilderPromptOptions = {}) {
  const validationRules =
    options.validationLevel === 'strict'
      ? [
          '- 输出前在内部按顺序模拟应用全部操作，并确认每一步的目标 ID 和相对路径在当时状态下有效',
          '- 确认 Patch 应用后的结果仍然符合上文的卡片 JSON Schema 和组件约束',
        ]
      : ['- 输出前在内部验证所有目标 ID 和相对路径；不要输出验证过程'];

  const resultRules =
    options.includeBaseRules === false
      ? []
      : [
          '- Patch 应用后，根节点的 `componentName` 必须仍为 `Page`，并包含 `state` 和 `methods` 字段',
          '- 节点的 `children` 必须是数组或字符串，不能是 JSExpression',
          '- `JSFunction` 的 `value` 必须是完整函数定义，且禁止使用 `alert`、`confirm`、`prompt`',
          '- 禁止新增 `background`、`color`、`background-color` 等颜色样式或弹窗组件',
          ...(options.wrapperComponent
            ? [`- 保持根节点由 \`${options.wrapperComponent}\` 组件包裹，禁止为其设置颜色样式`]
            : []),
        ];

  const ruleItems = [
    '- `id` 和 `positionId` 必须从当前 schemaJSON 中查找，禁止使用历史消息中已经失效的 ID',
    '- 通过组件类型、文本、属性和结构定位用户所指的组件；无法可靠定位时不要猜测',
    '- `remove` 使用被删除组件自身的 `id`，且不包含 `path`',
    '- `replace` 使用目标组件自身的 `id`，`path` 是组件内部的相对 JSON Pointer，例如 `/props/text`',
    '- `add` 使用父组件的 `id`，`path` 指定父组件内部的插入位置，例如 `/children/-`',
    '- `move.id` 是被移动组件，`positionId` 是目标锚点；两者都必须是当前 schemaJSON 中已有的组件 ID',
    '- `copy` 的 `from` 和 `path` 都相对于 `id` 指向的同一个组件',
    '- 新增组件应符合可用组件、属性和卡片 JSON Schema；不要杜撰组件 API',
    '- 多条操作按数组顺序执行，后续操作必须基于前面操作已经应用后的状态',
    ...resultRules,
    ...(options.isSkill ? ['- 禁止使用 Mock 数据，所有新增数据必须来自上下文或工具调用结果'] : []),
    ...validationRules,
    ...formatRules(options.rules ?? []),
  ];

  return `## Builder 编辑规则

${ruleItems.join('\n')}`;
}

export const builderExamplesPrompt = `## JSON Patch 示例

修改组件文本：

\`\`\`jsonPatch
[{ "op": "replace", "id": "text-1", "path": "/props/text", "value": "新文本" }]
\`\`\`

删除组件并移动另一个组件：

\`\`\`jsonPatch
[
  { "op": "remove", "id": "obsolete-card" },
  { "op": "move", "id": "summary-card", "positionId": "header-card", "position": "after" }
]
\`\`\``;

export const builderOutputPrompt = `## 输出要求

- 只输出一个 \`\`\`jsonPatch\` 代码块，不要输出 schemaJSON、候选操作、验证过程或其他说明
- 代码块内容必须是严格 JSON 格式的操作数组
- 无法可靠定位目标，或者用户要求不需要修改 schemaJSON 时，输出空数组 \`[]\``;

export function genBuilderPrompt(options: IGenBuilderPromptOptions = {}) {
  return [
    builderPromptPrefix,
    options.includePatchSchema === false ? null : genJsonPatchSchemaPrompt(),
    genBuilderRulesPrompt(options),
    options.includeExamples === false ? null : builderExamplesPrompt,
    builderOutputPrompt,
  ]
    .filter(Boolean)
    .join('\n\n');
}
