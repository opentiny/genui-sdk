import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { buildGenuiSchemaSkillBody } from '../formatters';
import {
  assignReferenceFiles,
  assertWrittenPromptCoverage,
  buildComponentCategoryFiles,
  buildComponentsIndex,
  ensureSkillFrontmatter,
  extractComponentsSchema,
  extractComponentsWhitelist,
  extractReferenceSections,
  extractSkillPrefix,
  generateSkillFiles,
  genSkillContent,
  headingToReferenceFile,
  normalizeReferenceSubdir,
  resolveHandwrittenCategoryLinks,
  sectionLink,
  splitPromptSections,
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

  it('headingToReferenceFile 拒绝不安全的 Markdown 文件名', () => {
    expect(() => headingToReferenceFile('## ../..')).toThrow(/reference 文件名不安全/);
    expect(() => headingToReferenceFile('## ../规则')).toThrow(/reference 文件名不安全/);
    expect(() => headingToReferenceFile('## 规则:说明')).toThrow(/reference 文件名不安全/);
    expect(() => headingToReferenceFile('## CON')).toThrow(/reference 文件名不安全/);
  });

  it('normalizeReferenceSubdir 拒绝逃逸 reference 的路径', () => {
    expect(normalizeReferenceSubdir('material-docs')).toBe('material-docs');
    expect(normalizeReferenceSubdir('nested/generated')).toBe('nested/generated');
    expect(normalizeReferenceSubdir('.')).toBe('');
    expect(() => normalizeReferenceSubdir('/tmp/generated')).toThrow(/相对路径/);
    expect(() => normalizeReferenceSubdir('C:\\tmp\\generated')).toThrow(/相对路径/);
    expect(() => normalizeReferenceSubdir('generated/..')).toThrow(/不安全路径片段/);
    expect(() => normalizeReferenceSubdir('../generated')).toThrow(/不安全路径片段/);
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
    expect(index).toContain('### 其他');
    expect(index).toContain('`A`, `B`');
    expect(index).not.toContain('components/basic.md');
    expect(index).not.toContain('按类别查阅');
  });

  it('buildComponentsIndex 按类型标题列出白名单', () => {
    const index = buildComponentsIndex(
      '`TinyForm`, `TinyHuichartsLine`, `TinyGrid`, `a`, `TinyCard`',
    );
    expect(index).toContain('### 基础元素');
    expect(index).toContain('### 布局组件');
    expect(index).toContain('### 表单组件');
    expect(index).toContain('### 数据展示');
    expect(index).toContain('### 图表组件');
    expect(index).toContain('`TinyForm`');
    expect(index).toContain('只定位已选组件');
    expect(index).not.toContain('### 其他');
  });

  it('buildComponentsIndex 有类型详情文件时按组出链，不再指向全量 dump', () => {
    const index = buildComponentsIndex('`TinyForm`, `TinyHuichartsLine`', 'generated/components.md', [
      {
        id: 'forms',
        label: '表单组件',
        components: ['TinyForm'],
        detailRelPath: 'generated/components/forms.md',
      },
      {
        id: 'charts',
        label: '图表组件',
        components: ['TinyHuichartsLine'],
        detailRelPath: 'generated/components/charts.md',
      },
    ]);

    expect(index).toContain('[generated/components/forms.md](generated/components/forms.md)');
    expect(index).toContain('[generated/components/charts.md](generated/components/charts.md)');
    expect(index).not.toMatch(/完整 props \/ events 见 \[generated\/components\.md\]/);
  });

  it('extractComponentsSchema / buildComponentCategoryFiles 按类型拆分 JSON', () => {
    const detail = `## 可用组件

必须使用以下支持的 componentName：\`TinyForm\`, \`TinyHuichartsLine\`

\`\`\`json
[{"component":"TinyForm","name":"表单"},{"component":"TinyHuichartsLine","name":"折线图"}]
\`\`\`
`;
    expect(extractComponentsSchema(detail)?.map((item) => item.component)).toEqual([
      'TinyForm',
      'TinyHuichartsLine',
    ]);

    const files = buildComponentCategoryFiles(detail, [
      { id: 'forms', label: '表单组件', components: ['TinyForm'] },
      { id: 'charts', label: '图表组件', components: ['TinyHuichartsLine'] },
    ]);
    expect(files).toHaveLength(2);
    expect(files[0].file).toBe('forms.md');
    expect(files[0].content).toContain('"component": "TinyForm"');
    expect(files[0].content).not.toContain('TinyHuichartsLine');
    expect(files[1].content).toContain('"component": "TinyHuichartsLine"');
    expect(files[1].content).not.toContain('TinyForm');
  });

  it('extractComponentsSchema 无 JSON fence 时返回 null', () => {
    expect(extractComponentsSchema('## 可用组件\n\n必须使用以下支持的 componentName：`A`\n')).toBe(
      null,
    );
  });

  it('resolveHandwrittenCategoryLinks 仅链已存在分类文件', () => {
    const skillDir = createTempDir('skill-category-');
    expect(resolveHandwrittenCategoryLinks(skillDir).size).toBe(0);

    mkdirSync(join(skillDir, 'reference', 'components'), { recursive: true });
    writeFileSync(join(skillDir, 'reference', 'components', 'forms.md'), '# forms\n', 'utf8');
    const links = resolveHandwrittenCategoryLinks(skillDir);
    expect(links.get('表单组件')).toBe('[表单组件](components/forms.md)');
    expect(links.has('基础元素')).toBe(false);
  });

  it('syncComponentsIndex 去掉不存在的分类死链并升级为类型索引', () => {
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
    expect(next).toContain('### 其他');
    expect(next).not.toContain('components/basic.md');
    expect(next).not.toContain('按类别查阅');
    expect(next).toContain('generated/components.md');
  });

  it('syncComponentsIndex 将手写分类文档挂到对应类型标题下', () => {
    const skillDir = createTempDir('skill-sync-forms-doc-');
    mkdirSync(join(skillDir, 'reference', 'components'), { recursive: true });
    writeFileSync(join(skillDir, 'reference', 'components', 'forms.md'), '# forms\n', 'utf8');

    syncComponentsIndex(
      skillDir,
      '## 可用组件\n\n必须使用以下支持的 componentName：`TinyForm`, `TinyInput`\n',
    );

    const next = readFileSync(join(skillDir, 'reference', 'components.md'), 'utf8');
    expect(next).toContain('### 表单组件');
    expect(next).toContain('详见 [表单组件](components/forms.md)');
    expect(next).not.toContain('components/basic.md');
  });

  it('syncComponentsIndex 使用受管区块保留格式不同的手写内容', () => {
    const skillDir = createTempDir('skill-sync-managed-');
    mkdirSync(join(skillDir, 'reference'), { recursive: true });
    const indexPath = join(skillDir, 'reference', 'components.md');
    writeFileSync(indexPath, '# 我的组件说明\n\n这里是手写内容。\n', 'utf8');

    syncComponentsIndex(
      skillDir,
      '## 可用组件\n\n必须使用以下支持的 componentName：`A`, `B`\n',
    );
    syncComponentsIndex(
      skillDir,
      '## 可用组件\n\n必须使用以下支持的 componentName：`C`\n',
    );

    const next = readFileSync(indexPath, 'utf8');
    expect(next).toContain('# 我的组件说明\n\n这里是手写内容。');
    expect(next).toContain('<!-- genui-skill-generator:start -->');
    expect(next).toContain('`C`');
    expect(next).not.toContain('`A`, `B`');
    expect(next.match(/genui-skill-generator:start/g)).toHaveLength(1);
  });

  it('syncComponentsIndex 拒绝损坏的受管区块，避免覆盖范围不明确', () => {
    const skillDir = createTempDir('skill-sync-invalid-managed-');
    mkdirSync(join(skillDir, 'reference'), { recursive: true });
    writeFileSync(
      join(skillDir, 'reference', 'components.md'),
      '# 手写内容\n\n<!-- genui-skill-generator:start -->\n',
      'utf8',
    );

    expect(() =>
      syncComponentsIndex(
        skillDir,
        '## 可用组件\n\n必须使用以下支持的 componentName：`A`\n',
      ),
    ).toThrow(/受管区块标记无效/);
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

  it('writeReferenceFiles 将组件 schema 拆到 generated/components 并更新索引链接', () => {
    const skillDir = createTempDir('skill-split-components-');
    const detail = `## 可用组件

必须使用以下支持的 componentName：\`TinyForm\`, \`TinyHuichartsLine\`

具体组件的上下文如下：

\`\`\`json
[{"component":"TinyForm","name":"表单"},{"component":"TinyHuichartsLine","name":"折线图"}]
\`\`\`
`;
    writeReferenceFiles(
      skillDir,
      { 'components.md': detail, 'rules.md': '## schemaJson 生成规则\nrules\n' },
      {
        componentGroups: [
          { id: 'forms', label: '表单组件', components: ['TinyForm'] },
          { id: 'charts', label: '图表组件', components: ['TinyHuichartsLine'] },
        ],
      },
    );

    const forms = readFileSync(
      join(skillDir, 'reference', 'generated', 'components', 'forms.md'),
      'utf8',
    );
    const charts = readFileSync(
      join(skillDir, 'reference', 'generated', 'components', 'charts.md'),
      'utf8',
    );
    const index = readFileSync(join(skillDir, 'reference', 'components.md'), 'utf8');
    const dump = readFileSync(join(skillDir, 'reference', 'generated', 'components.md'), 'utf8');

    expect(dump).toBe(detail);
    expect(forms).toContain('"component": "TinyForm"');
    expect(forms).not.toContain('TinyHuichartsLine');
    expect(charts).toContain('"component": "TinyHuichartsLine"');
    expect(index).toContain('generated/components/forms.md');
    expect(index).toContain('generated/components/charts.md');
    expect(index).not.toMatch(/完整 props \/ events 见 \[generated\/components\.md\]/);
  });

  it('writeReferenceFiles 无 JSON 时不拆类型文件，索引回退全量 dump', () => {
    const skillDir = createTempDir('skill-split-missing-json-');
    mkdirSync(join(skillDir, 'reference', 'generated', 'components'), { recursive: true });
    writeFileSync(
      join(skillDir, 'reference', 'generated', 'components', 'stale.md'),
      '# stale\n',
      'utf8',
    );

    writeReferenceFiles(
      skillDir,
      {
        'components.md':
          '## 可用组件\n\n必须使用以下支持的 componentName：`TinyForm`\n',
      },
      {
        componentGroups: [{ id: 'forms', label: '表单组件', components: ['TinyForm'] }],
      },
    );

    expect(existsSync(join(skillDir, 'reference', 'generated', 'components', 'forms.md'))).toBe(
      false,
    );
    expect(existsSync(join(skillDir, 'reference', 'generated', 'components', 'stale.md'))).toBe(
      false,
    );
    const index = readFileSync(join(skillDir, 'reference', 'components.md'), 'utf8');
    expect(index).toMatch(/完整 props \/ events 见 \[generated\/components\.md\]/);
  });

  it('referenceSubdir 为空时拒绝 prune，避免破坏 prompt 之外的手写文件', () => {
    const skillDir = createTempDir('skill-root-prune-');
    expect(() =>
      writeReferenceFiles(skillDir, { 'rules.md': 'rules' }, { referenceSubdir: '' }),
    ).toThrow(/不能启用 prune/);
    expect(() =>
      writeReferenceFiles(skillDir, { 'rules.md': 'rules' }, { referenceSubdir: '.' }),
    ).toThrow(/不能启用 prune/);
  });

  it('writeReferenceFiles 拒绝不安全的章节文件名', () => {
    const skillDir = createTempDir('skill-unsafe-file-');
    expect(() =>
      writeReferenceFiles(skillDir, { '../rules.md': 'rules' }, { prune: false }),
    ).toThrow(/reference 文件名不安全/);
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
