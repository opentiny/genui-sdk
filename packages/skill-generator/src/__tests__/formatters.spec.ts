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

function seedGenerated(skillDir: string, subdir = 'generated'): void {
  const generatedDir = subdir
    ? join(skillDir, 'reference', subdir)
    : join(skillDir, 'reference');
  mkdirSync(generatedDir, { recursive: true });
  writeFileSync(join(generatedDir, 'components.md'), '# g\n', 'utf8');
  writeFileSync(join(generatedDir, 'rules.md'), '# r\n', 'utf8');
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
  it('仅 generated 时不链缺失手写文档，回退 generated/rules', () => {
    const skillDir = createTempDir('skill-body-gen-');
    seedGenerated(skillDir);
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const body = buildGenuiSchemaSkillBody(markers, { skillDir });

    expect(body).not.toContain('reference/quick-ref.md');
    expect(body).not.toContain('reference/editing.md');
    expect(body).not.toContain('reference/examples/login-form.md');
    expect(body).not.toContain('reference/common-mistakes.md');
    expect(body).toContain('[components.md](reference/components.md)');
    expect(body).toContain('[generated/components.md](reference/generated/components.md)');
    expect(body).toContain('[rules.md](reference/generated/rules.md)');
    expect(body).toContain('## 完整物料');
    expect(body).toContain('## ⚠️ 输出格式');
  });

  it('手写存在时优先手写路径，并链分类文档', () => {
    const skillDir = createTempDir('skill-body-hw-');
    seedGenerated(skillDir);
    seedHandwritten(skillDir);
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const body = buildGenuiSchemaSkillBody(markers, { skillDir });

    expect(body).toContain('[quick-ref.md](reference/quick-ref.md)');
    expect(body).toContain('[login-form 示例](reference/examples/login-form.md)');
    expect(body).toContain('[editing.md](reference/editing.md)');
    expect(body).toContain('[common-mistakes.md](reference/common-mistakes.md)');
    expect(body).toContain('[rules.md](reference/rules.md)');
    // 意图路由用手写；完整物料表仍可链 generated/rules.md
    expect(body).toMatch(
      /新建表单[\s\S]*?\[rules\.md\]\(reference\/rules\.md\)/,
    );
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
