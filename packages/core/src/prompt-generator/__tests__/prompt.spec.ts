import { describe, expect, it } from 'vitest';
import type { IMaterialsMeta } from '../../material/materials-meta';
import { jsonPatchSchema } from '../../json-patch';
import { genPrompt } from '../prompt';

const materialsMeta: IMaterialsMeta = {
  materials: [],
  examples: [],
  whiteList: ['Page', 'Text'],
  wrapperComponent: 'Card',
  rules: ['保留物料约束'],
};

describe('genPrompt modes', () => {
  it('keeps generate as the default mode', () => {
    const prompt = genPrompt({ rules: [] }, materialsMeta);

    expect(prompt).toContain('生成一个卡片的 schemaJSON');
    expect(prompt).toContain('输出只允许是 schemaJson 代码块');
    expect(prompt).not.toContain('只输出一个 ```jsonPatch` 代码块');
  });

  it('uses an exclusive Builder output contract', () => {
    const prompt = genPrompt({ rules: ['保留框架约束'] }, materialsMeta, undefined, {
      mode: 'builder',
      builder: { validationLevel: 'strict' },
      rules: ['保留调用方约束'],
    });

    expect(prompt).toContain('不要重新生成完整 schemaJSON');
    expect(prompt).toContain('只输出一个 ```jsonPatch` 代码块');
    expect(prompt).not.toContain('输出只允许是 schemaJson 代码块');
    expect(prompt).toContain('保留物料约束');
    expect(prompt).toContain('保留框架约束');
    expect(prompt).toContain('保留调用方约束');
  });

  it('can omit Builder-specific schema and examples', () => {
    const prompt = genPrompt({ rules: [] }, materialsMeta, undefined, {
      mode: 'builder',
      builder: { includePatchSchema: false, includeExamples: false },
    });

    expect(prompt).not.toContain('JsonPatchOperations');
    expect(prompt).not.toContain('## JSON Patch 示例');
    expect(prompt).toContain('## 输出要求');
  });
});

describe('jsonPatchSchema', () => {
  it('accepts component-id remove operations', () => {
    expect(jsonPatchSchema.safeParse([{ op: 'remove', id: 'component-1' }]).success).toBe(true);
  });

  it('accepts component-relative remove paths', () => {
    expect(
      jsonPatchSchema.safeParse([{ op: 'remove', id: 'component-1', path: '/children/0' }]).success,
    ).toBe(true);
  });

  it('rejects copy until its component-relative semantics are redesigned', () => {
    expect(
      jsonPatchSchema.safeParse([
        { op: 'copy', id: 'component-1', from: '/props/source', path: '/props/target' },
      ]).success,
    ).toBe(false);
  });
});
