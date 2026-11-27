import { describe, expect, it } from 'vitest';
import { formatMoney } from '../src/materials/utils/format';
import { utils } from '../src/materials/utils/utils';
import example from '../src/meta/examples/utils.json';
import { utilsMeta } from '../src/meta/utils-meta-schemes';

describe('utilsMeta', () => {
  it('与运行时注册表保持一致，且所有 typeSchema 都是合法 JSON', () => {
    expect(utilsMeta.map((item) => item.name).sort()).toEqual(Object.keys(utils).sort());

    for (const item of utilsMeta) {
      expect(() => JSON.parse(item.typeSchema), item.name).not.toThrow();
    }
  });

  it('formatMoney 只声明实现支持的 value 和 digits 参数', () => {
    const meta = utilsMeta.find((item) => item.name === 'formatMoney');
    expect(meta).toBeDefined();

    const schema = JSON.parse(meta!.typeSchema);
    expect(schema.params.map((param: { name: string }) => param.name)).toEqual(['value', 'digits']);
    expect(meta!.usage).toBe('this.utils.formatMoney(1234.5, 2)');
    expect(formatMoney(1234.5, 2)).toBe('1,234.50');
  });

  it('dayjs 声明包含 usage 使用的 isAfter 方法', () => {
    const meta = utilsMeta.find((item) => item.name === 'dayjs');
    const schema = JSON.parse(meta!.typeSchema);

    expect(schema.returns.methods.some((method: { name: string }) => method.name === 'isAfter')).toBe(true);
  });
});

describe('utils 示例', () => {
  it('初始 state 与 utils 表达式可直接求值，不依赖派生 state 的初始化顺序', () => {
    const page = example.children[0];
    const expressions = page.children
      .filter((node) => node.componentName === 'Text')
      .map((node) => {
        if (!('props' in node) || typeof node.props.text !== 'object') {
          return '';
        }
        return node.props.text.value;
      });
    const context = { state: example.state, utils };
    const values = expressions.map((expression) => Function(`return (${expression})`).call(context));

    expect(values).toEqual(['12,345.68', '2026年09月21日 14:30', '2026-10-21', '研发部', '']);
    expect(example.state).not.toHaveProperty('formattedAmount');
    expect(example.state).not.toHaveProperty('formattedDate');
    expect(example.state).not.toHaveProperty('nextMonthDate');
    expect(example.state).not.toHaveProperty('deptName');
  });
});
