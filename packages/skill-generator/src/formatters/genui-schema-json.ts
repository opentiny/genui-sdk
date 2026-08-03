import type { IPromptSectionMarker } from '../skill-generator.js';
import { findSectionByTitle, sectionLink } from '../skill-generator.js';

const GENERATED = 'generated';

/**
 * 为 genui-schema-json skill 生成 Agent 友好正文。
 * 意图路由以手写文档为主，generated/ 仅作完整物料兜底。
 *
 * @param sectionMarkers - 从 prompt 提取的章节标记
 * @returns SKILL.md 正文
 */
export function buildGenuiSchemaSkillBody(sectionMarkers: IPromptSectionMarker[]): string {
  const generatedIndex = sectionMarkers
    .map((marker) => `| ${marker.title} | ${sectionLink(marker, GENERATED)} |`)
    .join('\n');

  const hasActions = Boolean(findSectionByTitle(sectionMarkers, 'action'));
  const actionRow = hasActions
    ? `| 调用 Action | [this-context.md](reference/this-context.md)、[generated/actions.md](reference/generated/actions.md) | [rules.md](reference/rules.md) |`
    : '';

  return `# GenUI schemaJson 生成技能

## ⚠️ 输出格式（最高优先级，必须遵守）

你的输出**只能**是一个 schemaJson 代码块。回复的第一行必须是字面量 \`\` \`\`\`schemaJson \`\`，最后一行必须是字面量 \`\` \`\`\` \`\`，中间是合法 JSON。

\`\`\`schemaJson
{ "componentName": "Page", "state": {}, "methods": {}, "children": [{ "componentName": "TinyCard", "children": [] }] }
\`\`\`

**禁止：** \`json\` 代码块、裸 JSON、代码块外的任何文字、多个代码块。

**技能模式约束：** 除上下文数据和工具调用结果外，禁止使用 Mock 数据。

## 意图路由（按场景选读，不要全读）

优先读手写文档；仅在需要完整 props / 全量示例时再读 \`reference/generated/\`。

| 用户意图 | 必读 | 选读 |
|---------|------|------|
| 新建表单 / 登录 / 注册 | [quick-ref.md](reference/quick-ref.md)、[rules.md](reference/rules.md)、[login-form 示例](reference/examples/login-form.md) | [forms.md](reference/components/forms.md)、[components.md](reference/components.md) |
| 展示信息 / 表格 / 图表 | [rules.md](reference/rules.md)、[common-mistakes.md](reference/common-mistakes.md)、[examples.md](reference/examples.md) | [data-display.md](reference/components/data-display.md) 或 [charts.md](reference/components/charts.md) |
| 修改已有卡片 | [rules.md](reference/rules.md)、[editing.md](reference/editing.md)、[this-context.md](reference/this-context.md) | 对话中的当前 schemaJson |
| 编写事件 / JSFunction | [this-context.md](reference/this-context.md) | [rules.md](reference/rules.md) |
${actionRow}

组件白名单与分类索引：[components.md](reference/components.md)

## Page 根节点骨架

- \`state\`、\`methods\` **始终存在**（无数据时用 \`{}\`）
- 字段顺序：\`componentName\` → \`state\` → \`methods\` → 其他 → \`children\`
- 根内容用 \`TinyCard\` 包裹；仅 \`TinyCard\` 禁止颜色样式，其他组件可正常使用 \`style\`

## 完整物料（与 genPrompt 同步，按需）

| 章节 | 文件 |
|------|------|
${generatedIndex}`;
}
