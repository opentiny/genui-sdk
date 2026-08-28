import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { isAbsolute, join, posix } from 'node:path';
import type {
  IGenPromptCustomConfig,
  IGenPromptFramework,
  IGenPromptFrameworkConfig,
  IGenPromptOptions,
  IMaterialsMeta,
} from '@opentiny/genui-sdk-core';
import { genPrompt } from '@opentiny/genui-sdk-core';

/** 匹配 prompt 顶层二级标题（行首 `## `，不含 `###`） */
const PROMPT_SECTION_HEADING_RE = /^## .+$/gm;

/** 匹配 SKILL.md 中由 genPrompt 注入的一级标题前缀 */
const SKILL_INJECTED_PREFIX_RE = /^# .+[\s\S]*?(?=\n## )/;

/**
 * 中文章节标题 → 英文 reference 文件名（写入 referenceSubdir 下）
 */
export const SECTION_FILE_ALIASES: Record<string, string> = {
  可用组件: 'components.md',
  '卡片的 JSON Schema': 'json-schema.md',
  卡片示例: 'examples.md',
  'Schema Snippets': 'schema-snippets.md',
  this上下文声明: 'this-context.md',
  'this 上下文声明': 'this-context.md',
  Action定义: 'actions.md',
  'Action 定义': 'actions.md',
  schemaJson生成规则: 'rules.md',
  'schemaJson 生成规则': 'rules.md',
};

export interface IPromptSectionMarker {
  /** 完整标题行，如 `## 可用组件` */
  marker: string;
  /** 标题文本，如 `可用组件` */
  title: string;
  /** reference 文件名 */
  file: string;
  /** 在 prompt 中的起始下标 */
  index: number;
}

export type SkillSections = Record<string, string>;

export interface IGenSkillContent {
  prompt: string;
  skillPrefix: string;
  sections: SkillSections;
  sectionMarkers: IPromptSectionMarker[];
}

export interface IGenerateSkillOptions {
  /** skill 输出目录列表；frontmatter 从首个目录的 SKILL.md 读取 */
  skillDirs: string[];
  /** genPrompt 自定义配置 */
  tgCustomConfig?: IGenPromptCustomConfig;
  /** 传给 genPrompt 的选项；默认仅设置 isSkill=true，其余沿用 genPrompt 默认值 */
  promptOptions?: IGenPromptOptions;
  /**
   * 可选：生成 SKILL.md 正文（输出格式、意图路由等）。
   * formatter 内容追加在原始 skillPromptPrefix 后，不能替换 genPrompt 内容。
   * 调用时传入 skillDir，用于按磁盘「存在才出链」。
   */
  formatSkillBody?: (
    sectionMarkers: IPromptSectionMarker[],
    context: { skillDir: string; referenceSubdir?: string },
  ) => string;
  /**
   * genPrompt 章节写入的子目录（相对 reference/）。
   * 默认 `generated`，与手写文档隔离，避免覆盖 rules/examples 等。
   * 传空字符串则直接写到 reference/。
   */
  referenceSubdir?: string;
  /**
   * 是否将白名单同步到手写 `reference/components.md`（更新白名单；分类链仅在文件存在时写出）。
   * 默认 true。
   */
  syncComponentsIndex?: boolean;
  /**
   * 是否删除 referenceSubdir 中本次未生成的文件。
   * 默认 true（只清理生成目录，不影响手写文档）。
   */
  prune?: boolean;
  /** 无 SKILL.md 时使用的默认 frontmatter */
  defaultFrontmatter?: string;
}

export interface IGenerateSkillResult extends IGenSkillContent {
  skillDirs: string[];
}

const DEFAULT_FRONTMATTER = `---
name: genui-schema-json
description: >-
  Generates and edits interactive GenUI schemaJson cards (TinyForm, TinyCard,
  TinyGrid, charts). Use when the user asks to create, fix, or modify genui
  cards, schemaJson, login forms, tables, UI layouts, or OpenTiny components.
---
`;

const DEFAULT_PROMPT_OPTIONS: IGenPromptOptions = {
  isSkill: true,
};

const COMPONENTS_INDEX_START = '<!-- genui-skill-generator:start -->';
const COMPONENTS_INDEX_END = '<!-- genui-skill-generator:end -->';
const WINDOWS_RESERVED_NAME_RE = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

function hasWindowsDrivePrefix(pathname: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(pathname);
}

function assertSafeReferenceFile(file: string): void {
  const stem = file.endsWith('.md') ? file.slice(0, -3) : file;
  const windowsDeviceName = stem.split('.')[0];
  if (
    !file ||
    isAbsolute(file) ||
    hasWindowsDrivePrefix(file) ||
    file.includes('/') ||
    file.includes('\\') ||
    file === '.' ||
    file === '..' ||
    !file.endsWith('.md') ||
    /[<>:"|?*\u0000-\u001f]/.test(file) ||
    stem.trimEnd() !== stem ||
    stem.endsWith('.') ||
    WINDOWS_RESERVED_NAME_RE.test(windowsDeviceName)
  ) {
    throw new Error(`reference 文件名不安全: ${file}`);
  }
}

/**
 * 规范化 reference 子目录，确保它不会逃出 skillDir/reference。
 *
 * @param referenceSubdir - 相对 reference/ 的子目录；空值表示直接写入 reference/
 * @returns 规范化后的安全子目录
 */
export function normalizeReferenceSubdir(referenceSubdir = 'generated'): string {
  if (!referenceSubdir) return '';
  if (isAbsolute(referenceSubdir) || hasWindowsDrivePrefix(referenceSubdir)) {
    throw new Error(`referenceSubdir 必须是相对路径: ${referenceSubdir}`);
  }

  const slashPath = referenceSubdir.replace(/\\/g, '/');
  if (slashPath === '.') return '';
  const rawSegments = slashPath.split('/');
  if (rawSegments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`referenceSubdir 包含不安全路径片段: ${referenceSubdir}`);
  }

  const normalized = posix.normalize(slashPath);
  if (normalized === '.') return '';

  const segments = normalized.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new Error(`referenceSubdir 包含不安全路径片段: ${referenceSubdir}`);
  }

  return normalized;
}

/**
 * 将章节标题转为 reference 文件名。
 * 优先使用 SECTION_FILE_ALIASES；否则含英文时提取英文片段；纯中文则去空白。
 *
 * @param heading - 完整标题行或标题文本
 * @returns reference 文件名（含 .md 后缀）
 */
export function headingToReferenceFile(heading: string): string {
  const title = heading.replace(/^##\s+/, '').trim();
  const aliased = SECTION_FILE_ALIASES[title] ?? SECTION_FILE_ALIASES[title.replace(/\s+/g, '')];
  if (aliased) {
    assertSafeReferenceFile(aliased);
    return aliased;
  }

  const asciiWords = title.match(/[a-zA-Z][a-zA-Z0-9]*/g);

  if (asciiWords?.length) {
    const slug = asciiWords
      .map((word) => word.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase())
      .join('-');
    const file = `${slug}.md`;
    assertSafeReferenceFile(file);
    return file;
  }

  const file = `${title.replace(/\s+/g, '')}.md`;
  assertSafeReferenceFile(file);
  return file;
}

/**
 * 为章节标记分配不重复的 reference 文件名。
 *
 * @param markers - 不含 file 字段的章节标记
 * @returns 带 file 字段的章节标记
 */
export function assignReferenceFiles(
  markers: Array<Omit<IPromptSectionMarker, 'file'>>,
): IPromptSectionMarker[] {
  const used = new Map<string, number>();

  return markers.map((marker) => {
    const baseName = headingToReferenceFile(marker.marker);
    const count = used.get(baseName) ?? 0;
    used.set(baseName, count + 1);

    const file =
      count === 0 ? baseName : baseName.replace(/\.md$/, `-${count + 1}.md`);

    return { ...marker, file };
  });
}

/**
 * 从 genPrompt 输出中提取顶层 `##` 章节标记。
 *
 * @param prompt - genPrompt 生成的完整提示词
 * @returns 按出现顺序排列的章节标记列表
 */
export function extractReferenceSections(prompt: string): IPromptSectionMarker[] {
  const markers: Array<Omit<IPromptSectionMarker, 'file'>> = [];

  for (const match of prompt.matchAll(PROMPT_SECTION_HEADING_RE)) {
    const marker = match[0];
    markers.push({
      marker,
      title: marker.replace(/^##\s+/, ''),
      index: match.index ?? 0,
    });
  }

  return assignReferenceFiles(markers);
}

/**
 * 从 prompt 提取写入 SKILL.md 的前缀（首个 `##` 章节之前的内容）。
 *
 * @param prompt - genPrompt 生成的完整提示词
 * @param sectionMarkers - 从 prompt 提取的章节标记
 * @returns SKILL.md 前缀内容
 */
export function extractSkillPrefix(prompt: string, sectionMarkers: IPromptSectionMarker[]): string {
  if (sectionMarkers.length === 0) {
    throw new Error('genPrompt 未包含 reference 章节（## 标题）');
  }

  return prompt.slice(0, sectionMarkers[0].index);
}

/**
 * 将完整提示词按提取的章节标记拆分为 reference 内容。
 *
 * @param prompt - genPrompt 生成的完整提示词
 * @param sectionMarkers - 从 prompt 提取的章节标记
 * @returns 章节文件名到内容的映射
 */
export function splitPromptSections(prompt: string, sectionMarkers: IPromptSectionMarker[]): SkillSections {
  const sections: SkillSections = {};

  for (let i = 0; i < sectionMarkers.length; i += 1) {
    const { file, index } = sectionMarkers[i];
    const end = i + 1 < sectionMarkers.length ? sectionMarkers[i + 1].index : prompt.length;
    sections[file] = prompt.slice(index, end);
  }

  return sections;
}

/**
 * 校验 SKILL.md 前缀 + reference 拼接后与原始 prompt 一致。
 *
 * @param prompt - 完整提示词
 * @param skillPrefix - SKILL.md 中的 prompt 前缀
 * @param sections - reference 章节
 * @param sectionMarkers - 章节标记顺序
 */
export function assertPromptCoverage(
  prompt: string,
  skillPrefix: string,
  sections: SkillSections,
  sectionMarkers: IPromptSectionMarker[],
): void {
  const reconstructed =
    skillPrefix + sectionMarkers.map(({ file }) => sections[file] ?? '').join('');

  if (reconstructed !== prompt) {
    throw new Error('SKILL.md 前缀 + reference 拼接后与 genPrompt 输出不一致');
  }
}

/**
 * 从已生成的 SKILL.md 前缀与 reference 文件重组 genPrompt，并校验逐字一致。
 * formatter 可以在原始前缀后追加路由说明，但不能替换或修改原始前缀。
 */
export function assertWrittenPromptCoverage(
  skillDir: string,
  prompt: string,
  skillPrefix: string,
  sectionMarkers: IPromptSectionMarker[],
  referenceSubdir = 'generated',
): void {
  const skillSource = readFileSync(join(skillDir, 'SKILL.md'), 'utf8');
  const frontmatter = skillSource.match(/^---[\s\S]*?---\n\n?/);
  if (!frontmatter) {
    throw new Error(`SKILL.md 格式无效，无法校验 genPrompt: ${skillDir}`);
  }

  const skillBody = skillSource.slice(frontmatter[0].length);
  if (!skillBody.startsWith(skillPrefix)) {
    throw new Error(`SKILL.md 未完整保留 genPrompt 前缀: ${skillDir}`);
  }

  const safeReferenceSubdir = normalizeReferenceSubdir(referenceSubdir);
  const referenceDir = safeReferenceSubdir
    ? join(skillDir, 'reference', safeReferenceSubdir)
    : join(skillDir, 'reference');
  const reconstructed =
    skillPrefix +
    sectionMarkers
      .map(({ file }) => {
        assertSafeReferenceFile(file);
        return readFileSync(join(referenceDir, file), 'utf8');
      })
      .join('');

  if (reconstructed !== prompt) {
    throw new Error(`生成文件无法逐字还原 genPrompt: ${skillDir}`);
  }
}

/**
 * 按标题关键词查找章节。
 *
 * @param sectionMarkers - 章节标记列表
 * @param keywords - 标题需包含的关键词（不区分大小写）
 * @returns 首个匹配的章节，未找到则 undefined
 */
export function findSectionByTitle(
  sectionMarkers: IPromptSectionMarker[],
  ...keywords: string[]
): IPromptSectionMarker | undefined {
  return sectionMarkers.find((marker) =>
    keywords.some((keyword) => marker.title.toLowerCase().includes(keyword.toLowerCase())),
  );
}

/**
 * 生成章节 reference 链接。
 *
 * @param marker - 章节标记
 * @param referenceSubdir - 可选子目录，如 `generated`
 * @returns Markdown 链接，无 marker 时返回空字符串
 */
export function sectionLink(marker?: IPromptSectionMarker, referenceSubdir = ''): string {
  if (!marker) return '';
  assertSafeReferenceFile(marker.file);
  const safeReferenceSubdir = normalizeReferenceSubdir(referenceSubdir);
  const rel = safeReferenceSubdir ? `${safeReferenceSubdir}/${marker.file}` : marker.file;
  return `[${marker.file}](reference/${rel})`;
}

/**
 * 基于 genPrompt 生成 skill 内容（纯函数，不涉及文件 IO）。
 *
 * @param framework - 框架名或框架配置
 * @param materialsMeta - 物料元信息
 * @param tgCustomConfig - genPrompt 自定义配置
 * @param promptOptions - genPrompt 选项
 * @returns prompt、章节标记、SKILL.md 前缀与 reference 章节
 */
export function genSkillContent(
  framework: IGenPromptFramework | IGenPromptFrameworkConfig,
  materialsMeta: IMaterialsMeta,
  tgCustomConfig?: IGenPromptCustomConfig,
  promptOptions?: IGenPromptOptions,
): IGenSkillContent {
  const options: IGenPromptOptions = {
    ...DEFAULT_PROMPT_OPTIONS,
    ...promptOptions,
    isSkill: promptOptions?.isSkill ?? true,
  };
  const prompt = genPrompt(framework, materialsMeta, tgCustomConfig, options);
  const sectionMarkers = extractReferenceSections(prompt);
  const skillPrefix = extractSkillPrefix(prompt, sectionMarkers);
  const sections = splitPromptSections(prompt, sectionMarkers);

  assertPromptCoverage(prompt, skillPrefix, sections, sectionMarkers);

  return { prompt, skillPrefix, sections, sectionMarkers };
}

/**
 * 确保 SKILL.md 存在并读取其 YAML frontmatter；不存在时写入默认 frontmatter。
 *
 * @param skillSourceDir - SKILL.md 源目录
 * @param defaultFrontmatter - 默认 frontmatter
 * @returns frontmatter 文本（含结尾换行）
 */
export function ensureSkillFrontmatter(
  skillSourceDir: string,
  defaultFrontmatter: string = DEFAULT_FRONTMATTER,
): string {
  const skillPath = join(skillSourceDir, 'SKILL.md');

  if (!existsSync(skillPath)) {
    mkdirSync(skillSourceDir, { recursive: true });
    writeFileSync(skillPath, defaultFrontmatter.endsWith('\n') ? defaultFrontmatter : `${defaultFrontmatter}\n`, 'utf8');
  }

  const source = readFileSync(skillPath, 'utf8');
  const match = source.match(/^---[\s\S]*?---\n\n?/);

  if (!match) {
    throw new Error('SKILL.md 格式无效，需包含 YAML frontmatter');
  }

  return match[0].endsWith('\n') ? match[0] : `${match[0]}\n`;
}

/**
 * 从 SKILL.md 正文中剥离 genPrompt 注入的一级标题前缀，保留模板正文。
 *
 * @param content - frontmatter 之后的正文
 * @returns 模板正文
 */
export function stripInjectedSkillPrefix(content: string): string {
  const stripped = content.replace(SKILL_INJECTED_PREFIX_RE, '').replace(/^\n+/, '');
  return stripped.trimEnd();
}

/**
 * 删除目录中不在本次生成列表内的 stale 文件（不删除子目录）。
 *
 * @param dir - 目标目录
 * @param sectionFiles - 本次生成的文件名列表
 */
export function removeStaleReferenceFiles(dir: string, sectionFiles: string[]): void {
  if (!existsSync(dir)) return;

  const allowed = new Set(sectionFiles);

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) continue;
    if (!allowed.has(entry.name)) {
      unlinkSync(join(dir, entry.name));
    }
  }
}

/**
 * 从完整组件章节提取白名单文本。
 *
 * @param detail - 完整「可用组件」章节
 * @returns 白名单片段（含反引号列表）
 */
export function extractComponentsWhitelist(detail: string): string {
  const whitelistMatch = detail.match(/必须使用以下支持的 componentName：([^\n]+)/);
  return whitelistMatch?.[1]?.trim() ?? '';
}

/** 可选分类手写文档（仅当 `reference/components/<file>` 存在时出链） */
export const COMPONENT_CATEGORY_DOCS = [
  { file: 'basic.md', label: '基础元素' },
  { file: 'layout.md', label: '布局组件' },
  { file: 'forms.md', label: '表单组件' },
  { file: 'data-display.md', label: '数据展示' },
  { file: 'charts.md', label: '图表组件' },
] as const;

/**
 * 根据磁盘上已有的分类文档生成「按类别查阅」段落；无文件则返回空串。
 *
 * @param skillDir - skill 目录
 * @returns Markdown 段落（含前后换行）或空串
 */
export function buildCategoryLinksSection(skillDir: string): string {
  const dir = join(skillDir, 'reference', 'components');
  const links = COMPONENT_CATEGORY_DOCS.filter(({ file }) => existsSync(join(dir, file))).map(
    ({ file, label }) => `- [${label}](components/${file})`,
  );
  if (links.length === 0) return '';
  return `\n按类别查阅（见 SKILL.md 意图路由）：\n\n${links.join('\n')}\n`;
}

/**
 * 生成手写层 `components.md` 精简索引正文。
 *
 * @param whitelist - 白名单文本
 * @param detailRelPath - 完整详情相对路径
 * @param categorySection - 可选分类链接段落（仅含已存在文件）
 * @returns Markdown
 */
export function buildComponentsIndex(
  whitelist: string,
  detailRelPath = 'generated/components.md',
  categorySection = '',
): string {
  return `## 可用组件

必须使用以下支持的 componentName：${whitelist}

> 白名单以本文件为准（由物料同步）。
${categorySection}
完整 props / events 见 [${detailRelPath}](${detailRelPath})（按需再读）。
`;
}

function buildManagedComponentsIndex(
  whitelist: string,
  detailRelPath: string,
  categorySection: string,
): string {
  return `${COMPONENTS_INDEX_START}\n${buildComponentsIndex(
    whitelist,
    detailRelPath,
    categorySection,
  ).trimEnd()}\n${COMPONENTS_INDEX_END}`;
}

/**
 * 将白名单同步到手写 `reference/components.md`：兼容更新旧白名单行，其他情况使用受管区块。
 * 受管区块之外的手写内容保持不变；标记损坏时拒绝写入。
 * 分类链接按磁盘存在情况重写，避免死链。
 *
 * @param skillDir - skill 目录
 * @param componentsDetail - 生成的完整组件章节
 * @param detailRelPath - 详情相对 reference/ 的路径
 */
export function syncComponentsIndex(
  skillDir: string,
  componentsDetail: string,
  detailRelPath = 'generated/components.md',
): void {
  const whitelist = extractComponentsWhitelist(componentsDetail);
  if (!whitelist) return;

  const indexPath = join(skillDir, 'reference', 'components.md');
  mkdirSync(join(skillDir, 'reference'), { recursive: true });
  const categorySection = buildCategoryLinksSection(skillDir);

  if (existsSync(indexPath)) {
    const current = readFileSync(indexPath, 'utf8');
    const managedStart = current.indexOf(COMPONENTS_INDEX_START);
    const managedEnd = current.indexOf(COMPONENTS_INDEX_END);
    const hasManagedMarker = managedStart >= 0 || managedEnd >= 0;
    const hasDuplicateMarker =
      current.indexOf(COMPONENTS_INDEX_START, managedStart + 1) >= 0 ||
      current.indexOf(COMPONENTS_INDEX_END, managedEnd + 1) >= 0;
    if (
      hasManagedMarker &&
      (managedStart < 0 || managedEnd < managedStart || hasDuplicateMarker)
    ) {
      throw new Error(`components.md 受管区块标记无效: ${indexPath}`);
    }
    if (managedStart >= 0 && managedEnd > managedStart) {
      const next = `${current.slice(0, managedStart)}${buildManagedComponentsIndex(
        whitelist,
        detailRelPath,
        categorySection,
      )}${current.slice(managedEnd + COMPONENTS_INDEX_END.length)}`;
      writeFileSync(indexPath, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
      return;
    }

    if (/必须使用以下支持的 componentName：/.test(current)) {
      let next = current.replace(
        /必须使用以下支持的 componentName：[^\n]+/,
        `必须使用以下支持的 componentName：${whitelist}`,
      );
      next = next.replace(
        /> 白名单以本文件为准（由物料同步）。[^\n]*/,
        '> 白名单以本文件为准（由物料同步）。',
      );
      // 纠正历史详情链接（components-detail.md → generated/components.md）
      next = next.replace(
        /\[([^\]]*)\]\(components-detail\.md\)/g,
        `[$1](${detailRelPath})`,
      );
      next = next.replace(
        /见 \[components-detail\.md\]\([^)]+\)/g,
        `见 [${detailRelPath}](${detailRelPath})`,
      );
      if (!next.includes(detailRelPath) && /完整 props/.test(next)) {
        next = next.replace(
          /完整 props[^\n]+/,
          `完整 props / events 见 [${detailRelPath}](${detailRelPath})（按需再读）。`,
        );
      }
      // 按磁盘重写分类段落（无文件则去掉，避免死链）
      if (/按类别查阅/.test(next)) {
        next = next.replace(/\n按类别查阅[\s\S]*?(?=\n完整 props)/, categorySection);
      } else if (categorySection) {
        next = next.replace(/(\n完整 props)/, `${categorySection}$1`);
      }
      // 折叠可能留下的多余空行
      next = next.replace(/\n{3,}/g, '\n\n');
      writeFileSync(indexPath, next.endsWith('\n') ? next : `${next}\n`, 'utf8');
      return;
    }

    const separator = current.endsWith('\n\n') ? '' : current.endsWith('\n') ? '\n' : '\n\n';
    const next = `${current}${separator}${buildManagedComponentsIndex(
      whitelist,
      detailRelPath,
      categorySection,
    )}\n`;
    writeFileSync(indexPath, next, 'utf8');
    return;
  }

  writeFileSync(
    indexPath,
    `${buildManagedComponentsIndex(whitelist, detailRelPath, categorySection)}\n`,
    'utf8',
  );
}

/**
 * 写入 genPrompt 拆分后的 reference 章节到隔离子目录。
 *
 * @param skillDir - skill 目录
 * @param sections - 章节内容
 * @param options - 子目录与 prune 选项
 */
export function writeReferenceFiles(
  skillDir: string,
  sections: SkillSections,
  options: { referenceSubdir?: string; prune?: boolean; syncComponentsIndex?: boolean } = {},
): void {
  const referenceSubdir = normalizeReferenceSubdir(options.referenceSubdir ?? 'generated');
  const prune = options.prune ?? true;
  const shouldSyncIndex = options.syncComponentsIndex ?? true;

  if (!referenceSubdir && prune) {
    throw new Error('referenceSubdir 为空时不能启用 prune，以免删除手写 reference 文件');
  }

  const referenceDir = join(skillDir, 'reference');
  const outputDir = referenceSubdir ? join(referenceDir, referenceSubdir) : referenceDir;
  mkdirSync(outputDir, { recursive: true });

  const written: string[] = [];

  for (const [file, content] of Object.entries(sections)) {
    if (!content) continue;
    assertSafeReferenceFile(file);
    // reference 是 genPrompt 的无损分片，禁止格式化或补换行。
    writeFileSync(join(outputDir, file), content, 'utf8');
    written.push(file);

    // 空子目录时详情与索引路径相同，不能用索引逻辑改写原始 prompt 分片。
    if (shouldSyncIndex && referenceSubdir && file === 'components.md') {
      const detailRel = referenceSubdir ? `${referenceSubdir}/components.md` : 'components.md';
      syncComponentsIndex(skillDir, content, detailRel);
    }
  }

  if (prune) {
    removeStaleReferenceFiles(outputDir, written);
  }
}

/**
 * 将 skill 入口写入各 skill 目录的 SKILL.md。
 * 始终逐字保留 genPrompt 前缀；有 formatSkillBody 时在其后追加 Agent 友好路由。
 * 每个目录单独生成正文，以便按该目录已有文件出链。
 *
 * @param skillDirs - skill 目录列表
 * @param skillPrefix - genPrompt 前缀
 * @param sectionMarkers - 章节标记（供 formatSkillBody 使用）
 * @param formatSkillBody - 可选，生成 Agent 友好正文
 * @param defaultFrontmatter - 默认 frontmatter
 * @param referenceSubdir - 生成章节子目录
 */
export function writeSkillEntry(
  skillDirs: string[],
  skillPrefix: string,
  sectionMarkers: IPromptSectionMarker[],
  formatSkillBody?: IGenerateSkillOptions['formatSkillBody'],
  defaultFrontmatter?: string,
  referenceSubdir?: string,
): void {
  if (skillDirs.length === 0) {
    throw new Error('skillDirs 不能为空');
  }

  const frontmatter = ensureSkillFrontmatter(skillDirs[0], defaultFrontmatter);
  const subdir = normalizeReferenceSubdir(referenceSubdir ?? 'generated');

  for (const skillDir of skillDirs) {
    mkdirSync(skillDir, { recursive: true });
    const formattedBody = formatSkillBody?.(sectionMarkers, {
      skillDir,
      referenceSubdir: subdir,
    });
    const body = formattedBody
      ? `${skillPrefix}${skillPrefix.endsWith('\n') ? '' : '\n'}\n${formattedBody}`
      : skillPrefix;
    const content = `${frontmatter}${body}`;
    writeFileSync(join(skillDir, 'SKILL.md'), content, 'utf8');
  }
}

/**
 * 根据 materialsMeta 生成 skill 文件：先写 reference/generated/，再写 SKILL.md。
 * 手写文档（quick-ref、editing、components/ 等）不被覆盖；意图路由仅链接已存在文件。
 *
 * @param framework - 框架名或框架配置
 * @param materialsMeta - 物料元信息
 * @param options - 输出路径与 genPrompt 自定义配置
 * @returns 生成结果摘要
 */
export function generateSkillFiles(
  framework: IGenPromptFramework | IGenPromptFrameworkConfig,
  materialsMeta: IMaterialsMeta,
  options: IGenerateSkillOptions,
): IGenerateSkillResult {
  const { prompt, skillPrefix, sections, sectionMarkers } = genSkillContent(
    framework,
    materialsMeta,
    options.tgCustomConfig,
    options.promptOptions,
  );

  const referenceSubdir = normalizeReferenceSubdir(options.referenceSubdir ?? 'generated');

  // 先落盘 generated/（及 components 白名单同步），再写 SKILL，便于「存在才出链」含 generated 回退
  for (const skillDir of options.skillDirs) {
    writeReferenceFiles(skillDir, sections, {
      referenceSubdir,
      prune: options.prune ?? true,
      syncComponentsIndex: options.syncComponentsIndex ?? true,
    });
  }

  writeSkillEntry(
    options.skillDirs,
    skillPrefix,
    sectionMarkers,
    options.formatSkillBody,
    options.defaultFrontmatter,
    referenceSubdir,
  );

  for (const skillDir of options.skillDirs) {
    assertWrittenPromptCoverage(
      skillDir,
      prompt,
      skillPrefix,
      sectionMarkers,
      referenceSubdir,
    );
  }

  return {
    prompt,
    skillPrefix,
    sections,
    sectionMarkers,
    skillDirs: options.skillDirs,
  };
}
