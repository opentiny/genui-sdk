import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { IPromptSectionMarker } from '../skill-generator.js';
import { findSectionByTitle, normalizeReferenceSubdir, sectionLink } from '../skill-generator.js';

/** SKILL.md 正文生成时的目录上下文 */
export interface ISkillBodyContext {
  /** 当前写入的 skill 目录（用于「存在才出链」） */
  skillDir: string;
  /** genPrompt 章节子目录，默认 generated */
  referenceSubdir?: string;
}

/**
 * 为 genui-schema-json skill 生成 Agent 友好正文。
 * 意图路由优先手写文档；文件不存在时回退到 generated/（若已落盘）。
 *
 * @param sectionMarkers - 从 prompt 提取的章节标记
 * @param context - skill 目录上下文
 * @returns SKILL.md 正文
 */
export function buildGenuiSchemaSkillBody(
  sectionMarkers: IPromptSectionMarker[],
  context: ISkillBodyContext,
): string {
  const subdir = normalizeReferenceSubdir(context.referenceSubdir ?? 'generated');
  const generatedDirLabel = subdir ? `reference/${subdir}/` : 'reference/';
  const generatedIndex = sectionMarkers
    .map((marker) => `| ${marker.title} | ${sectionLink(marker, subdir)} |`)
    .join('\n');

  const rules = preferDoc(context, 'rules.md', 'rules.md', subdir);
  const thisContext = preferDoc(context, 'this-context.md', 'this-context.md', subdir);
  const examples = preferDoc(context, 'examples.md', 'examples.md', subdir);
  const componentsIndex = linkIfExists(context, 'reference/components.md', 'components.md');
  const componentsDetailPath = generatedPath(subdir, 'components.md');
  const componentsGenerated =
    componentsDetailPath === 'reference/components.md'
      ? null
      : linkIfExists(context, componentsDetailPath, generatedLabel(subdir, 'components.md'));

  const formRequired = joinLinks([
    linkIfExists(context, 'reference/quick-ref.md', 'quick-ref.md'),
    rules,
    linkIfExists(context, 'reference/examples/login-form.md', 'login-form 示例'),
  ]);
  const formOptional = joinLinks([componentsIndex, componentsGenerated]);

  const displayRequired = joinLinks([
    rules,
    linkIfExists(context, 'reference/common-mistakes.md', 'common-mistakes.md'),
    examples,
  ]);
  const displayOptional = joinLinks([
    linkIfExists(context, 'reference/components/data-display.md', 'data-display.md'),
    linkIfExists(context, 'reference/components/charts.md', 'charts.md'),
    componentsIndex,
    componentsGenerated,
  ]);

  const editRequired = joinLinks([
    rules,
    linkIfExists(context, 'reference/editing.md', 'editing.md'),
    thisContext,
  ]);

  const eventRequired = joinLinks([thisContext]);
  const eventOptional = joinLinks([rules]);

  const hasActions = Boolean(findSectionByTitle(sectionMarkers, 'action'));
  const actionRow = hasActions
    ? `| 调用 Action | ${joinLinks([
        thisContext,
        linkIfExists(
          context,
          generatedPath(subdir, 'actions.md'),
          generatedLabel(subdir, 'actions.md'),
        ),
      ]) || '—'} | ${eventOptional || '—'} |`
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

优先读手写文档；仅在需要完整 props / 全量示例时再读 \`${generatedDirLabel}\`。链接仅包含当前 skill 目录中已存在的文件。

| 用户意图 | 必读 | 选读 |
|---------|------|------|
| 新建表单 / 登录 / 注册 | ${formRequired || '—'} | ${formOptional || '—'} |
| 展示信息 / 表格 / 图表 | ${displayRequired || '—'} | ${displayOptional || '—'} |
| 修改已有卡片 | ${editRequired || '—'} | 对话中的当前 schemaJson |
| 编写事件 / JSFunction | ${eventRequired || '—'} | ${eventOptional || '—'} |
${actionRow}

${componentsIndex ? `组件白名单索引：${componentsIndex}` : '组件白名单见下方完整物料。'}

## Page 根节点骨架

- \`state\`、\`methods\` **始终存在**（无数据时用 \`{}\`）
- 字段顺序：\`componentName\` → \`state\` → \`methods\` → 其他 → \`children\`
- 根内容用 \`TinyCard\` 包裹；仅 \`TinyCard\` 禁止颜色样式，其他组件可正常使用 \`style\`

## 完整物料（与 genPrompt 同步，按需）

| 章节 | 文件 |
|------|------|
${generatedIndex}`;
}

function generatedPath(subdir: string, file: string): string {
  return subdir ? `reference/${subdir}/${file}` : `reference/${file}`;
}

function generatedLabel(subdir: string, file: string): string {
  return subdir ? `${subdir}/${file}` : file;
}

function linkIfExists(
  context: ISkillBodyContext,
  relPath: string,
  label: string,
): string | null {
  if (!existsSync(join(context.skillDir, relPath))) return null;
  return `[${label}](${relPath})`;
}

/** 手写优先；不存在则回退 generated/ 同名文件 */
function preferDoc(
  context: ISkillBodyContext,
  handwrittenFile: string,
  label: string,
  subdir: string,
): string | null {
  return (
    linkIfExists(context, `reference/${handwrittenFile}`, label) ??
    linkIfExists(context, generatedPath(subdir, handwrittenFile), label)
  );
}

function joinLinks(parts: Array<string | null | undefined>, sep = '、'): string {
  return parts.filter((part): part is string => Boolean(part)).join(sep);
}
