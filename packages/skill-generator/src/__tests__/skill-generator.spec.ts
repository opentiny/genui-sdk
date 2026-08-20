import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildGenuiSchemaSkillBody } from '../formatters';
import {
  assignReferenceFiles,
  assertWrittenPromptCoverage,
  buildCategoryLinksSection,
  buildComponentsIndex,
  ensureSkillFrontmatter,
  extractComponentsWhitelist,
  extractReferenceSections,
  extractSkillPrefix,
  generateSkillFiles,
  genSkillContent,
  headingToReferenceFile,
  sectionLink,
  splitPromptSections,
  stripInjectedSkillPrefix,
  syncComponentsIndex,
  writeReferenceFiles,
  writeSkillEntry,
} from '../skill-generator';

const SAMPLE_PROMPT = `# 技能说明

你有一项技能。



## 可用组件

必须使用以下支持的 componentName：\`TinyForm\`, \`TinyInput\`

## 卡片的 JSON Schema

schema

## schemaJson 生成规则

rules
`;

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe('skill-generator', () => {
  it('extractReferenceSections 从 prompt 提取章节并用英文文件名', () => {
    const markers = extractReferenceSections(SAMPLE_PROMPT);

    expect(markers.map((marker) => marker.title)).toEqual([
      '可用组件',
      '卡片的 JSON Schema',
      'schemaJson 生成规则',
    ]);
    expect(markers.map((marker) => marker.file)).toEqual([
      'components.md',
      'json-schema.md',
      'rules.md',
    ]);
  });

  it('extractSkillPrefix 取首个 ## 之前的内容', () => {
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    expect(extractSkillPrefix(SAMPLE_PROMPT, markers)).toBe(`# 技能说明

你有一项技能。



`);
  });

  it('splitPromptSections 拼接后与 prompt 一致', () => {
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const prefix = extractSkillPrefix(SAMPLE_PROMPT, markers);
    const sections = splitPromptSections(SAMPLE_PROMPT, markers);
    const reconstructed =
      prefix + markers.map((marker) => sections[marker.file]).join('');

    expect(reconstructed).toBe(SAMPLE_PROMPT);
  });

  it('assignReferenceFiles 处理重名文件', () => {
    const files = assignReferenceFiles([
      { marker: '## JSON Schema', title: 'JSON Schema', index: 0 },
      { marker: '## JSON Schema', title: 'JSON Schema', index: 10 },
    ]);

    expect(files[0].file).toBe('json-schema.md');
    expect(files[1].file).toBe('json-schema-2.md');
  });

  it('headingToReferenceFile 生成稳定英文文件名', () => {
    expect(headingToReferenceFile('## Schema Snippets')).toBe('schema-snippets.md');
    expect(headingToReferenceFile('## 卡片示例')).toBe('examples.md');
    expect(headingToReferenceFile('## this 上下文声明')).toBe('this-context.md');
    expect(headingToReferenceFile('## 可用组件')).toBe('components.md');
  });

  it('sectionLink 支持 generated 子目录', () => {
    const marker = { marker: '## 规则', title: '规则', file: 'rules.md', index: 0 };
    expect(sectionLink(marker)).toBe('[rules.md](reference/rules.md)');
    expect(sectionLink(marker, 'generated')).toBe('[rules.md](reference/generated/rules.md)');
  });

  it('extractComponentsWhitelist / buildComponentsIndex', () => {
    const detail = `## 可用组件\n\n必须使用以下支持的 componentName：\`A\`, \`B\`\n\n\`\`\`json\n[]\n\`\`\`\n`;
    expect(extractComponentsWhitelist(detail)).toBe('`A`, `B`');
    const index = buildComponentsIndex('`A`, `B`');
    expect(index).toContain('generated/components.md');
    expect(index).not.toContain('components/basic.md');
    expect(index).not.toContain('按类别查阅');
  });

  it('buildCategoryLinksSection 仅链已存在分类文件', () => {
    const skillDir = createTempDir('skill-category-');
    expect(buildCategoryLinksSection(skillDir)).toBe('');

    mkdirSync(join(skillDir, 'reference', 'components'), { recursive: true });
    writeFileSync(join(skillDir, 'reference', 'components', 'forms.md'), '# forms\n', 'utf8');
    const section = buildCategoryLinksSection(skillDir);
    expect(section).toContain('[表单组件](components/forms.md)');
    expect(section).not.toContain('basic.md');
  });

  it('syncComponentsIndex 去掉不存在的分类死链', () => {
    const skillDir = createTempDir('skill-sync-');
    mkdirSync(join(skillDir, 'reference'), { recursive: true });
    writeFileSync(
      join(skillDir, 'reference', 'components.md'),
      `## 可用组件

必须使用以下支持的 componentName：\`Old\`

> 白名单以本文件为准（由物料同步）。分类文档若名称不一致，以白名单为准。

按类别查阅（见 SKILL.md 意图路由）：

- [基础元素](components/basic.md)
- [表单组件](components/forms.md)

完整 props / events 见 [generated/components.md](generated/components.md)（按需再读）。
`,
      'utf8',
    );

    syncComponentsIndex(
      skillDir,
      '## 可用组件\n\n必须使用以下支持的 componentName：`A`, `B`\n',
    );

    const next = readFileSync(join(skillDir, 'reference', 'components.md'), 'utf8');
    expect(next).toContain('`A`, `B`');
    expect(next).not.toContain('components/basic.md');
    expect(next).not.toContain('按类别查阅');
    expect(next).toContain('generated/components.md');
  });

  it('stripInjectedSkillPrefix 剥离一级标题前缀', () => {
    const content = `# 技能说明

说明文字

## 意图路由

表格
`;
    expect(stripInjectedSkillPrefix(content)).toBe(`## 意图路由

表格`);
  });

  it('ensureSkillFrontmatter 只读取 YAML frontmatter', () => {
    const skillSourceDir = createTempDir('skill-frontmatter-');
    writeFileSync(
      join(skillSourceDir, 'SKILL.md'),
      `---
name: genui-schema-json
description: test
---

# body
`,
      'utf8',
    );
    const frontmatter = ensureSkillFrontmatter(skillSourceDir);

    expect(frontmatter).toMatch(/^---\nname: genui-schema-json[\s\S]*\n---\n+$/);
  });

  it('落盘后可从 SKILL 前缀和 reference 逐字还原 genPrompt', () => {
    const skillDir = createTempDir('skill-coverage-');
    const prompt = SAMPLE_PROMPT.trimEnd();
    const markers = extractReferenceSections(prompt);
    const prefix = extractSkillPrefix(prompt, markers);
    const sections = splitPromptSections(prompt, markers);

    writeReferenceFiles(skillDir, sections, { syncComponentsIndex: false });
    writeSkillEntry(
      [skillDir],
      prefix,
      markers,
      () => '# 附加路由\n\n按需读取 reference。\n',
    );

    expect(() =>
      assertWrittenPromptCoverage(skillDir, prompt, prefix, markers),
    ).not.toThrow();
    expect(readFileSync(join(skillDir, 'reference', 'generated', 'rules.md'), 'utf8'))
      .toBe(sections['rules.md']);
  });

  it('reference 分片被修改后无法通过落盘一致性校验', () => {
    const skillDir = createTempDir('skill-coverage-corrupt-');
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const prefix = extractSkillPrefix(SAMPLE_PROMPT, markers);
    const sections = splitPromptSections(SAMPLE_PROMPT, markers);

    writeReferenceFiles(skillDir, sections, { syncComponentsIndex: false });
    writeSkillEntry([skillDir], prefix, markers);
    writeFileSync(join(skillDir, 'reference', 'generated', 'rules.md'), 'corrupted', 'utf8');

    expect(() =>
      assertWrittenPromptCoverage(skillDir, SAMPLE_PROMPT, prefix, markers),
    ).toThrow(/无法逐字还原 genPrompt/);
  });

  it('SKILL.md 原始前缀被修改后无法通过落盘一致性校验', () => {
    const skillDir = createTempDir('skill-prefix-corrupt-');
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const prefix = extractSkillPrefix(SAMPLE_PROMPT, markers);
    const sections = splitPromptSections(SAMPLE_PROMPT, markers);

    writeReferenceFiles(skillDir, sections, { syncComponentsIndex: false });
    writeSkillEntry([skillDir], prefix, markers);
    const skillPath = join(skillDir, 'SKILL.md');
    writeFileSync(skillPath, readFileSync(skillPath, 'utf8').replace('# 技能说明', '# 已损坏'), 'utf8');

    expect(() =>
      assertWrittenPromptCoverage(skillDir, SAMPLE_PROMPT, prefix, markers),
    ).toThrow(/未完整保留 genPrompt 前缀/);
  });

  it('默认保留 genPrompt 的 JSON Schema，并将自定义 Action 写入独立章节', () => {
    const generated = genSkillContent(
      'vue',
      { materials: [], examples: [], whiteList: [] },
      {
        customActions: [
          {
            name: 'continueChat',
            description: '继续对话',
            parameters: {
              type: 'object',
              properties: { message: { type: 'string' } },
            },
          },
        ],
      },
    );

    expect(generated.sectionMarkers.map(({ file }) => file)).toContain('json-schema.md');
    expect(generated.sectionMarkers.map(({ file }) => file)).toContain('actions.md');
    expect(generated.sections['actions.md']).toContain('continueChat');
    expect(
      generated.skillPrefix +
        generated.sectionMarkers.map(({ file }) => generated.sections[file]).join(''),
    ).toBe(generated.prompt);
  });

  it('referenceSubdir 为空时拒绝 prune，避免破坏 prompt 之外的手写文件', () => {
    const skillDir = createTempDir('skill-root-prune-');
    expect(() =>
      writeReferenceFiles(skillDir, { 'rules.md': 'rules' }, { referenceSubdir: '' }),
    ).toThrow(/不能启用 prune/);
  });

  it('generateSkillFiles 完整生成、复用 frontmatter，并只清理生成目录旧文件', () => {
    const rootDir = createTempDir('skill-e2e-');
    const firstSkillDir = join(rootDir, 'first');
    const secondSkillDir = join(rootDir, 'second');
    const frontmatter = `---\nname: e2e-skill\ndescription: end-to-end test\n---\n`;
    mkdirSync(join(firstSkillDir, 'reference', 'generated'), { recursive: true });
    mkdirSync(join(firstSkillDir, 'reference'), { recursive: true });
    writeFileSync(join(firstSkillDir, 'SKILL.md'), frontmatter, 'utf8');
    writeFileSync(join(firstSkillDir, 'reference', 'manual.md'), '# keep\n', 'utf8');
    writeFileSync(join(firstSkillDir, 'reference', 'generated', 'stale.md'), '# stale\n', 'utf8');

    const result = generateSkillFiles(
      'vue',
      { materials: [], examples: [], whiteList: [] },
      {
        skillDirs: [firstSkillDir, secondSkillDir],
        formatSkillBody: buildGenuiSchemaSkillBody,
        syncComponentsIndex: false,
        tgCustomConfig: { customActions: [{ name: 'continueChat' }] },
      },
    );

    expect(result.skillDirs).toEqual([firstSkillDir, secondSkillDir]);
    expect(existsSync(join(firstSkillDir, 'reference', 'generated', 'stale.md'))).toBe(false);
    expect(readFileSync(join(firstSkillDir, 'reference', 'manual.md'), 'utf8')).toBe('# keep\n');
    expect(readFileSync(join(secondSkillDir, 'SKILL.md'), 'utf8')).toMatch(
      /^---\nname: e2e-skill\ndescription: end-to-end test\n---\n/,
    );
    expect(existsSync(join(secondSkillDir, 'reference', 'generated', 'actions.md'))).toBe(true);

    for (const skillDir of result.skillDirs) {
      expect(() =>
        assertWrittenPromptCoverage(
          skillDir,
          result.prompt,
          result.skillPrefix,
          result.sectionMarkers,
        ),
      ).not.toThrow();
    }
  });

  it('ensureSkillFrontmatter 创建默认文件并拒绝非法 frontmatter', () => {
    const missingDir = createTempDir('skill-frontmatter-create-');
    const invalidDir = createTempDir('skill-frontmatter-invalid-');
    writeFileSync(join(invalidDir, 'SKILL.md'), '# missing yaml\n', 'utf8');

    expect(ensureSkillFrontmatter(missingDir)).toMatch(/^---\n/);
    expect(existsSync(join(missingDir, 'SKILL.md'))).toBe(true);
    expect(() => ensureSkillFrontmatter(invalidDir)).toThrow(/YAML frontmatter/);
  });
});
