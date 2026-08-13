import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
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

function seedGenerated(skillDir: string): void {
  mkdirSync(join(skillDir, 'reference', 'generated'), { recursive: true });
  writeFileSync(join(skillDir, 'reference', 'generated', 'components.md'), '# g\n', 'utf8');
  writeFileSync(join(skillDir, 'reference', 'generated', 'rules.md'), '# r\n', 'utf8');
  writeFileSync(join(skillDir, 'reference', 'components.md'), '# index\n', 'utf8');
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
    const skillDir = mkdtempSync(join(tmpdir(), 'skill-body-gen-'));
    seedGenerated(skillDir);
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const body = buildGenuiSchemaSkillBody(markers, { skillDir });

    expect(body).not.toContain('reference/quick-ref.md');
    expect(body).not.toContain('reference/editing.md');
    expect(body).not.toContain('reference/examples/login-form.md');
    expect(body).not.toContain('reference/common-mistakes.md');
    expect(body).toContain('[rules.md](reference/generated/rules.md)');
    expect(body).toContain('[components.md](reference/components.md)');
    expect(body).toContain('[generated/components.md](reference/generated/components.md)');
    expect(body).toContain('[rules.md](reference/generated/rules.md)');
    expect(body).toContain('## 完整物料');
    expect(body).toContain('## ⚠️ 输出格式');
  });

  it('手写存在时优先手写路径，并链分类文档', () => {
    const skillDir = mkdtempSync(join(tmpdir(), 'skill-body-hw-'));
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

  it('resolveSkillBodyFormatter 解析内置名称', () => {
    expect(resolveSkillBodyFormatter('genui-schema-json')).toBe(
      SKILL_BODY_FORMATTERS['genui-schema-json'],
    );
  });

  it('resolveSkillBodyFormatter 未知名称抛出错误', () => {
    expect(() => resolveSkillBodyFormatter('unknown')).toThrow(/未知的 skillBodyFormatter/);
  });
});
