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

describe('formatters', () => {
  it('buildGenuiSchemaSkillBody 手写优先并链接 generated/', () => {
    const markers = extractReferenceSections(SAMPLE_PROMPT);
    const body = buildGenuiSchemaSkillBody(markers);

    expect(body).toContain('[quick-ref.md](reference/quick-ref.md)');
    expect(body).toContain('[login-form 示例](reference/examples/login-form.md)');
    expect(body).toContain('[editing.md](reference/editing.md)');
    expect(body).toContain('[common-mistakes.md](reference/common-mistakes.md)');
    expect(body).toContain('[rules.md](reference/generated/rules.md)');
    expect(body).toContain('[components.md](reference/generated/components.md)');
    expect(body).toContain('## 完整物料');
    expect(body).toContain('## ⚠️ 输出格式');
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
