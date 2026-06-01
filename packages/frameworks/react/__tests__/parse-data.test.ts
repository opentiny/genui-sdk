import { describe, it, expect } from 'vitest';
import { parseData, parseCondition } from '../src/engine';

describe('parseData', () => {
  const ctx = {
    state: { count: 2, form: { name: 'test' } },
    refs: {},
    methods: {},
  };

  it('parses JSExpression against state', () => {
    const result = parseData(
      { type: 'JSExpression', value: 'this.state.count + 1' },
      {},
      ctx,
    );
    expect(result).toBe(3);
  });

  it('parses condition', () => {
    expect(parseCondition(true, {}, ctx)).toBe(true);
    expect(
      parseCondition({ type: 'JSExpression', value: 'this.state.count > 0' }, {}, ctx),
    ).toBe(true);
  });
});
