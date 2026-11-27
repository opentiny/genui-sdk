import { describe, expect, it } from 'vitest';
import { genUtilsPrompt } from '../utils';
import type { IUtilsMeta } from '../../material';

describe('genUtilsPrompt（自定义 JSON Schema）', () => {
  it('空数组返回空字符串', () => {
    expect(genUtilsPrompt([])).toBe('');
  });

  it('多行 JSON Schema 使用 json 围栏，并保留说明和示例', () => {
    const typeSchema = JSON.stringify(
      {
        type: 'function',
        params: [
          { name: 'date', type: 'Date | number | string' },
          { name: 'format', type: 'string', optional: true },
        ],
        returns: { type: 'string' },
      },
      null,
      2,
    );
    const output = genUtilsPrompt([
      {
        name: 'formatDate',
        description: '格式化日期',
        typeSchema,
        usage: "this.utils.formatDate(Date.now(), 'YYYY-MM-DD')",
      },
    ]);

    expect(output).toContain('```json');
    expect(output).not.toContain('```ts');
    expect(output).toContain('  - 说明：格式化日期');
    expect(output).toContain("- 示例：`this.utils.formatDate(Date.now(), 'YYYY-MM-DD')`");
    expect(JSON.parse(typeSchema)).toMatchObject({ type: 'function', returns: { type: 'string' } });
  });

  it('类和方法等多行声明保持合法 JSON 及稳定缩进', () => {
    const typeSchema = JSON.stringify(
      {
        type: 'class',
        methods: [
          {
            name: 'on',
            params: [
              { name: 'event', type: 'string' },
              { name: 'handler', type: '(...args: unknown[]) => void' },
            ],
            returns: { type: '() => void' },
          },
        ],
      },
      null,
      2,
    );
    const output = genUtilsPrompt([{ name: 'EventBus', typeSchema }]);

    expect(output).toContain('```json\n  {');
    expect(output).toContain('\n    "type": "class",');
    expect(output).toContain('\n    "methods": [');
    expect(output).not.toContain('```ts');
  });

  it('单行 JSON Schema 保持行内代码', () => {
    const output = genUtilsPrompt([{ name: 'DAY_MS', typeSchema: '{ "type": "number" }' }]);

    expect(output).toContain('- `this.utils.DAY_MS`：`{ "type": "number" }`');
    expect(output).not.toContain('```');
  });
});
