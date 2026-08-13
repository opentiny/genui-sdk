import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  assignReferenceFiles,
  buildCategoryLinksSection,
  buildComponentsIndex,
  ensureSkillFrontmatter,
  extractComponentsWhitelist,
  extractReferenceSections,
  extractSkillPrefix,
  headingToReferenceFile,
  sectionLink,
  splitPromptSections,
  stripInjectedSkillPrefix,
  syncComponentsIndex,
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
    const skillDir = mkdtempSync(join(tmpdir(), 'skill-category-'));
    expect(buildCategoryLinksSection(skillDir)).toBe('');

    mkdirSync(join(skillDir, 'reference', 'components'), { recursive: true });
    writeFileSync(join(skillDir, 'reference', 'components', 'forms.md'), '# forms\n', 'utf8');
    const section = buildCategoryLinksSection(skillDir);
    expect(section).toContain('[表单组件](components/forms.md)');
    expect(section).not.toContain('basic.md');
  });

  it('syncComponentsIndex 去掉不存在的分类死链', () => {
    const skillDir = mkdtempSync(join(tmpdir(), 'skill-sync-'));
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
    const skillSourceDir = mkdtempSync(join(tmpdir(), 'skill-frontmatter-'));
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
});
