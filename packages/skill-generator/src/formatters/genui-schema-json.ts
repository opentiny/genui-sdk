import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { IComponentCategoryGroup } from '../component-categories.js';
import { COMPONENT_CATEGORY_DOCS } from '../component-categories.js';
import type { IPromptSectionMarker } from '../skill-generator.js';
import { findSectionByTitle, normalizeReferenceSubdir, sectionLink } from '../skill-generator.js';

/** SKILL.md 正文生成时的目录上下文 */
export interface ISkillBodyContext {
  /** 当前写入的 skill 目录（用于「存在才出链」） */
  skillDir: string;
  /** genPrompt 章节子目录，默认 generated */
  referenceSubdir?: string;
  /** 与 components.md 同源的类型分组，用于入口类型索引 */
  componentGroups?: IComponentCategoryGroup[];
}

/**
 * 为 genui-schema-json skill 生成 Agent 友好正文。
 * 工作流把 json-schema 提升为每次生成的结构契约；组件按类型索引，按需再读详情。
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
  const jsonSchema = preferDoc(context, 'json-schema.md', 'json-schema.md', subdir);
  const rules = preferDoc(context, 'rules.md', 'rules.md', subdir);
  const thisContext = preferDoc(context, 'this-context.md', 'this-context.md', subdir);
  const examples = preferDoc(context, 'examples.md', 'examples.md', subdir);
  const snippets = preferDoc(context, 'schema-snippets.md', 'schema-snippets.md', subdir);
  const componentsIndex = linkIfExists(context, 'reference/components.md', 'components.md');
  const componentsDetailPath = generatedPath(subdir, 'components.md');
  const componentsGenerated =
    componentsDetailPath === 'reference/components.md'
      ? null
      : linkIfExists(context, componentsDetailPath, generatedLabel(subdir, 'components.md'));
  const categoryDetailLinks = resolveCategoryDetailLinks(context, subdir);
  const hasCategoryDetails = categoryDetailLinks.length > 0;
  const actions = findSectionByTitle(sectionMarkers, 'action')
    ? linkIfExists(
        context,
        generatedPath(subdir, 'actions.md'),
        generatedLabel(subdir, 'actions.md'),
      )
    : null;

  const quickRef = linkIfExists(context, 'reference/quick-ref.md', 'quick-ref.md');
  const loginForm = linkIfExists(
    context,
    'reference/examples/login-form.md',
    'login-form 示例',
  );
  const editing = linkIfExists(context, 'reference/editing.md', 'editing.md');
  const commonMistakes = linkIfExists(
    context,
    'reference/common-mistakes.md',
    'common-mistakes.md',
  );
  const formsDoc = linkIfExists(context, 'reference/components/forms.md', 'forms.md');
  const dataDisplayDoc = linkIfExists(
    context,
    'reference/components/data-display.md',
    'data-display.md',
  );
  const chartsDoc = linkIfExists(context, 'reference/components/charts.md', 'charts.md');
  const formsDetail = categoryDetailLink(categoryDetailLinks, 'forms');
  const dataDisplayDetail = categoryDetailLink(categoryDetailLinks, 'data-display');
  const chartsDetail = categoryDetailLink(categoryDetailLinks, 'charts');

  const indexHref = componentsIndex
    ? 'reference/components.md'
    : componentsGenerated
      ? componentsDetailPath
      : null;
  const typeIndex = buildTypeIndex(context.componentGroups ?? [], indexHref, categoryDetailLinks);

  const propsStep = hasCategoryDetails
    ? '4. 需要 props / events 时，只读下方「组件类型索引」中对应类型文件，禁止读取 `generated/components.md` 全文'
    : `4. 需要某组件的 props / events 时，在 ${inlineRef(componentsGenerated ?? componentsIndex, 'generated/components.md')} 中按组件名定位，禁止通读`;

  const workflow = [
    `1. 读结构契约：${inlineRef(jsonSchema, 'json-schema.md')} — 节点字段、componentName 白名单 enum、JSExpression / JSFunction / JSSlot`,
    `2. 读生成约束：${inlineRef(rules, 'rules.md')}`,
    `3. 按类型选组件：打开 ${inlineRef(componentsIndex ?? componentsGenerated, 'components.md')} 对应章节，不要读全部类型`,
    propsStep,
    `5. 写 methods / 事件时读 ${inlineRef(thisContext, 'this-context.md')}${
      actions ? `；调用 Action 时再读 ${actions}` : ''
    }`,
    `6. 需要整卡参考时读 ${inlineRef(examples, 'examples.md')} 或 ${inlineRef(snippets, 'schema-snippets.md')}`,
    '7. 只输出一个 schemaJson 代码块（见上方格式）',
  ].join('\n');

  const newCardExtras = bullets(quickRef, loginForm, examples);
  const editExtras = bullets(editing);
  const formExtras = bullets(formsDetail, quickRef, loginForm, formsDoc);
  const tableExtras = bullets(dataDisplayDetail, dataDisplayDoc, examples, commonMistakes);
  const chartExtras = bullets(chartsDetail, chartsDoc, examples, commonMistakes);
  const actionExtras = actions
    ? `\n\n**调用 Action**\n- ${inlineRef(thisContext, 'this-context.md')}、${actions}`
    : '';
  const generatedHint = hasCategoryDetails
    ? `组件 props 只读 \`${generatedDirLabel}components/\` 下对应类型文件；示例再读 \`${generatedDirLabel}\` 中的 examples / snippets。链接仅包含当前 skill 目录中已存在的文件。`
    : `仅在需要完整 props / 全量示例时再读 \`${generatedDirLabel}\`。链接仅包含当前 skill 目录中已存在的文件。`;
  const propsHint = hasCategoryDetails
    ? '属性细节只读组件类型索引中的对应类型文件'
    : `属性细节再读 ${inlineRef(componentsGenerated ?? componentsIndex, 'generated/components.md')}`;
  const generatedIndex = buildGeneratedCatalog(sectionMarkers, subdir, context, hasCategoryDetails);

  return `# GenUI schemaJson 生成技能

## ⚠️ 输出格式（最高优先级，必须遵守）

你的输出**只能**是一个 schemaJson 代码块。回复的第一行必须是字面量 \`\` \`\`\`schemaJson \`\`，最后一行必须是字面量 \`\` \`\`\` \`\`，中间是合法 JSON。

\`\`\`schemaJson
{ "componentName": "Page", "state": {}, "methods": {}, "children": [{ "componentName": "TinyCard", "children": [] }] }
\`\`\`

**禁止：** \`json\` 代码块、裸 JSON、代码块外的任何文字、多个代码块。

**技能模式约束：** 除上下文数据和工具调用结果外，禁止使用 Mock 数据。

## 工作流（按步读取，不要一次读完全部 reference）

每次生成或修改 schemaJson 时按顺序执行：

${workflow}

${generatedHint}

## 按任务补读

**新建卡片**（表单、表格、图表、信息展示）
- 必走工作流第 1–4 步：${inlineRef(jsonSchema, 'json-schema.md')}、${inlineRef(rules, 'rules.md')}、类型索引
- ${propsHint}${newCardExtras}

**修改已有卡片**
- 以对话中的当前 schemaJson 为准
- 用 ${inlineRef(jsonSchema, 'json-schema.md')}、${inlineRef(rules, 'rules.md')} 校验结构与约束
- 改事件 / methods：${inlineRef(thisContext, 'this-context.md')}${editExtras}

**表单 / 登录 / 注册**
- 看类型索引「表单组件」
- 输入项必须双向绑定（见 ${inlineRef(rules, 'rules.md')}）${formExtras}

**表格 / 分页**
- 看类型索引「数据展示」${tableExtras}

**图表**
- 看类型索引「图表组件」${chartExtras}

**编写事件 / JSFunction**
- ${inlineRef(thisContext, 'this-context.md')}；对照 ${inlineRef(jsonSchema, 'json-schema.md')} 中的 JSFunction / JSExpression 结构${actionExtras}

${typeIndex}

## Page 根节点骨架

- \`state\`、\`methods\` **始终存在**（无数据时用 \`{}\`）
- 字段顺序：\`componentName\` → \`state\` → \`methods\` → 其他 → \`children\`
- 根内容用 \`TinyCard\` 包裹；仅 \`TinyCard\` 禁止颜色样式，其他组件可正常使用 \`style\`

## 完整物料（按需再读）

| 章节 | 文件 |
|------|------|
${generatedIndex}`;
}

function buildTypeIndex(
  groups: IComponentCategoryGroup[],
  indexHref: string | null,
  categoryDetailLinks: Array<{ id: string; link: string }>,
): string {
  const visible = groups.filter((group) => group.components.length > 0);
  const linksById = new Map(categoryDetailLinks.map((item) => [item.id, item.link]));
  if (!indexHref && categoryDetailLinks.length === 0) {
    return '## 组件类型索引\n\n组件白名单见下方完整物料。';
  }

  const heading = indexHref
    ? `## 组件类型索引\n\n从 [${indexHref === 'reference/components.md' ? 'components.md' : indexHref.replace(/^reference\//, '')}](${indexHref}) 看白名单；props / events 只读当前任务对应的类型文件（名称必须在白名单内）：`
    : '## 组件类型索引\n\nprops / events 只读当前任务对应的类型文件（名称必须在白名单内）：';
  if (visible.length === 0 && categoryDetailLinks.length === 0) {
    return heading;
  }

  const items = (visible.length ? visible : COMPONENT_CATEGORY_DOCS)
    .map((group) => {
      const splitLink = linksById.get(group.id);
      if (splitLink) return `- ${splitLink}`;
      if (indexHref) return `- [${group.label}](${indexHref}#${group.label})`;
      return null;
    })
    .filter((item): item is string => Boolean(item));

  if (items.length === 0) {
    return heading;
  }

  return `${heading}\n\n${items.join('\n')}`;
}

function resolveCategoryDetailLinks(
  context: ISkillBodyContext,
  subdir: string,
): Array<{ id: string; link: string }> {
  const groups = (context.componentGroups ?? []).filter((group) => group.components.length > 0);
  const source = groups.length ? groups : COMPONENT_CATEGORY_DOCS;
  return source.flatMap((group) => {
    const relPath = generatedPath(subdir, `components/${group.id}.md`);
    const link = linkIfExists(context, relPath, group.label);
    return link ? [{ id: group.id, link }] : [];
  });
}

function categoryDetailLink(
  links: Array<{ id: string; link: string }>,
  id: string,
): string | null {
  return links.find((item) => item.id === id)?.link ?? null;
}

function buildGeneratedCatalog(
  sectionMarkers: IPromptSectionMarker[],
  subdir: string,
  context: ISkillBodyContext,
  hasCategoryDetails: boolean,
): string {
  const groups = (context.componentGroups ?? []).filter((group) => group.components.length > 0);
  const source = groups.length ? groups : COMPONENT_CATEGORY_DOCS;

  return sectionMarkers
    .flatMap((marker) => {
      if (hasCategoryDetails && marker.file === 'components.md') {
        const categoryRows = source
          .map((group) => {
            const relPath = generatedPath(subdir, `components/${group.id}.md`);
            const label = generatedLabel(subdir, `components/${group.id}.md`);
            const link = linkIfExists(context, relPath, label);
            return link ? `| ${group.label} | ${link} |` : null;
          })
          .filter((row): row is string => Boolean(row));
        if (categoryRows.length) return categoryRows;
      }
      return [`| ${marker.title} | ${sectionLink(marker, subdir)} |`];
    })
    .join('\n');
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

function inlineRef(link: string | null, fallback: string): string {
  return link ?? `\`${fallback}\``;
}

function bullets(...parts: Array<string | null | undefined>): string {
  const items = parts.filter((part): part is string => Boolean(part));
  if (items.length === 0) return '';
  return `\n${items.map((item) => `- ${item}`).join('\n')}`;
}
