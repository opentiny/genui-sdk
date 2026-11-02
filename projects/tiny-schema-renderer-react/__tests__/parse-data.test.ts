import { describe, it, expect } from 'vitest';
import { parseData, parseCondition } from '../src/engine';

describe('parseData', () => {
  const ctx = {
    state: { count: 2, form: { name: 'test' } },
    refs: {},
    methods: {},
  };

  it('parses JSExpression against state', () => {
    const result = parseData({ type: 'JSExpression', value: 'this.state.count + 1' }, {}, ctx);
    expect(result).toBe(3);
  });

  it('parses condition', () => {
    expect(parseCondition(true, {}, ctx)).toBe(true);
    expect(parseCondition({ type: 'JSExpression', value: 'this.state.count > 0' }, {}, ctx)).toBe(true);
  });

  it('keeps empty params as a normal expression', () => {
    const result = parseData({ type: 'JSExpression', value: 'this.state.count', params: [] }, {}, ctx);
    expect(result).toBe(2);
  });

  it('preserves leading and trailing whitespace in strings', () => {
    expect(parseData('  keep spaces  ', {}, ctx)).toBe('  keep spaces  ');
  });

  it('wires ref JSExpression into a ref-assignment callback', () => {
    const ctxWithRefs = { ...ctx, refs: { formRef: null } };
    const result = parseData({ ref: { type: 'JSExpression', value: 'this.refs.formRef' } }, {}, ctxWithRefs) as {
      ref: (instance: unknown) => void;
    };
    expect(typeof result.ref).toBe('function');
    result.ref({ id: 'form-1' });
    expect(ctxWithRefs.refs.formRef).toEqual({ id: 'form-1' });
  });
});
