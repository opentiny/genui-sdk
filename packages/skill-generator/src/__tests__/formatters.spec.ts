import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  buildGenuiSchemaSkillBody,
  resolveSkillBodyFormatter,
  SKILL_BODY_FORMATTERS,
} from '../formatters';
import { extractReferenceSections } from '../skill-generator';

const SAMPLE_PROMPT = `# 技能说明

你有一项技能。



## 可用组件

components

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

const SAMPLE_GROUPS = [
  { id: 'forms' as const, label: '表单组件', components: ['TinyForm', 'TinyInput'] },
  { id: 'charts' as const, label: '图表组件', components: ['TinyHuichartsLine'] },
];

function seedGenerated(skillDir: string, subdir = 'generated'): void {
  const generatedDir = subdir
    ? join(skillDir, 'reference', subdir)
    : join(skillDir, 'reference');
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(join(generatedDir, 'components.md'), '# g\n', 'utf8');
  writeFileSync(join(generatedDir, 'rules.md'), '# r\n', 'utf8');
  writeFileSync(join(generatedDir, 'json-schema.md'), '# s\n', 'utf8');
  if (subdir) {
    writeFileSync(join(skillDir, 'reference', 'components.md'), '# index\n', 'utf8');
  }
}

function seedHandwritten(skillDir: string): void {
  mkdirSync(join(skillDir, 'reference', 'examples'), { recursive: true });
  mkdirSync(join(skillDir, 'reference', 'components'), { recursive: true });
  for (const file of [
    'quick-ref.md',
    'rules.md',
    'common-mistakes.md',
    'editing.md',
    'this-context.md',
    'examples.md',
  ]) {
    writeFileSync(join(skillDir, 'reference', file), `# ${file}\n`, 'utf8');
  }
  writeFileSync(join(skillDir, 'reference', 'examples', 'login-form.md'), '# login\n', 'utf8');
  writeFileSync(join(skillDir, 'reference', 'components', 'forms.md'), '# forms\n', 'utf8');
  writeFileSync(join(skillDir, 'reference', 'components', 'charts.md'), '# charts\n', 'utf8');
  writeFileSync(
    join(skillDir, 'reference', 'components', 'data-display.md'),
    '# data\n',
    'utf8',
  );
}

describe('formatters', () => {
  it('仅 generated 时不链缺失手写文档，回退 generated/rules，工作流必含 json-schema', () => {
    const skillDir = createTempDir('skill-body-gen-');
    seedGenerated(skillDir);
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const body = buildGenuiSchemaSkillBody(markers, {
      skillDir,
      componentGroups: SAMPLE_GROUPS,
    });

    expect(body).not.toContain('reference/quick-ref.md');
    expect(body).not.toContain('reference/editing.md');
    expect(body).not.toContain('reference/examples/login-form.md');
    expect(body).not.toContain('reference/common-mistakes.md');
    expect(body).not.toContain('| 用户意图 | 必读 | 选读 |');
    expect(body).toContain('## 工作流');
    expect(body).toContain('## 按任务补读');
    expect(body).toContain('[components.md](reference/components.md)');
    expect(body).toContain('[generated/components.md](reference/generated/components.md)');
    expect(body).toContain('[rules.md](reference/generated/rules.md)');
    const workflow = body.slice(body.indexOf('## 工作流'), body.indexOf('## 按任务补读'));
    expect(workflow).toContain('[json-schema.md](reference/generated/json-schema.md)');
    expect(body).toContain('[表单组件](reference/components.md#表单组件)');
    expect(body).toContain('[图表组件](reference/components.md#图表组件)');
    expect(body).toContain('## 完整物料（按需再读）');
    expect(body).not.toContain('genPrompt');
    expect(body).toContain('## ⚠️ 输出格式');
  });

  it('存在类型拆分文件时，类型索引与工作流链拆分文件而非全量 dump', () => {
    const skillDir = createTempDir('skill-body-split-');
    seedGenerated(skillDir);
    mkdirSync(join(skillDir, 'reference', 'generated', 'components'), { recursive: true });
    writeFileSync(
      join(skillDir, 'reference', 'generated', 'components', 'forms.md'),
      '# forms schema\n',
      'utf8',
    );
    writeFileSync(
      join(skillDir, 'reference', 'generated', 'components', 'charts.md'),
      '# charts schema\n',
      'utf8',
    );
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const body = buildGenuiSchemaSkillBody(markers, {
      skillDir,
      componentGroups: SAMPLE_GROUPS,
    });

    expect(body).toContain('[表单组件](reference/generated/components/forms.md)');
    expect(body).toContain('[图表组件](reference/generated/components/charts.md)');
    expect(body).not.toContain('[表单组件](reference/components.md#表单组件)');
    expect(body).toContain('| 表单组件 | [generated/components/forms.md](reference/generated/components/forms.md) |');
    expect(body).not.toMatch(
      /\| 可用组件 \| \[components\.md\]\(reference\/generated\/components\.md\) \|/,
    );
    const workflow = body.slice(body.indexOf('## 工作流'), body.indexOf('## 按任务补读'));
    expect(workflow).toContain('禁止读取 `generated/components.md` 全文');
    expect(workflow).not.toContain('中按组件名定位');
  });

  it('手写存在时优先手写路径，并链分类文档', () => {
    const skillDir = createTempDir('skill-body-hw-');
    seedGenerated(skillDir);
    seedHandwritten(skillDir);
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const body = buildGenuiSchemaSkillBody(markers, {
      skillDir,
      componentGroups: SAMPLE_GROUPS,
    });

    expect(body).toContain('[quick-ref.md](reference/quick-ref.md)');
    expect(body).toContain('[login-form 示例](reference/examples/login-form.md)');
    expect(body).toContain('[editing.md](reference/editing.md)');
    expect(body).toContain('[common-mistakes.md](reference/common-mistakes.md)');
    expect(body).toContain('[rules.md](reference/rules.md)');
    expect(body).toContain('[forms.md](reference/components/forms.md)');
    expect(body).toMatch(/表单 \/ 登录 \/ 注册[\s\S]*?\[rules\.md\]\(reference\/rules\.md\)/);
    expect(body).toContain('[data-display.md](reference/components/data-display.md)');
    expect(body).toContain('[charts.md](reference/components/charts.md)');
  });

  it('非默认 referenceSubdir 使用实际目录生成链接文字和读取提示', () => {
    const skillDir = createTempDir('skill-body-custom-');
    seedGenerated(skillDir, 'material-docs');
    writeFileSync(join(skillDir, 'reference', 'material-docs', 'actions.md'), '# actions\n', 'utf8');
    const markers = extractReferenceSections(`${SAMPLE_PROMPT}\n## Action 定义\n\nactions\n`);
    const body = buildGenuiSchemaSkillBody(markers, {
      skillDir,
      referenceSubdir: 'material-docs',
    });

    expect(body).toContain(
      '[material-docs/components.md](reference/material-docs/components.md)',
    );
    expect(body).toContain('[material-docs/actions.md](reference/material-docs/actions.md)');
    expect(body).toContain('再读 `reference/material-docs/`');
    expect(body).not.toContain('[generated/');
  });

  it('空 referenceSubdir 直接链接 reference，且不重复组件链接', () => {
    const skillDir = createTempDir('skill-body-root-');
    seedGenerated(skillDir, '');
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const body = buildGenuiSchemaSkillBody(markers, { skillDir, referenceSubdir: '' });

    expect(body).toContain('[components.md](reference/components.md)');
    expect(body).toContain('[rules.md](reference/rules.md)');
    expect(body).toContain('再读 `reference/`');
    expect(body).not.toContain('reference/generated/');
    expect(body).not.toContain(
      '[components.md](reference/components.md)、[components.md](reference/components.md)',
    );
  });

  it('resolveSkillBodyFormatter 解析内置名称', () => {
    expect(resolveSkillBodyFormatter('genui-schema-json')).toBe(
      SKILL_BODY_FORMATTERS['genui-schema-json'],
    );
  });

  it('resolveSkillBodyFormatter 未知名称抛出错误', () => {
    expect(() => resolveSkillBodyFormatter('unknown')).toThrow(/未知的 skillBodyFormatter/);
  });
});
