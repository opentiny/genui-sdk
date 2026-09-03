import { describe, expect, it } from 'vitest';
import { transformStateMutations } from '../src/engine/transform-state-mutations';
import { setIn } from '../src/engine';

function simulate(source: string, initial: Record<string, unknown>) {
  const compiled = transformStateMutations(source);
  let state = initial;
  const ctx = {
    setState: (updater: (s: Record<string, unknown>) => Record<string, unknown>) => {
      state = updater(state);
    },
    setIn,
  };
  // 模拟 parseExpression 的 with($scope) 执行：返回编译后的函数，再调用它
  const fn = new Function('$scope', 'with($scope){ return ' + compiled + ' }');
  const compiledFn = fn.call(ctx, { ...ctx });
  compiledFn.call(ctx);
  return state;
}

describe('runtime mutation semantics', () => {
  it('compiled push works on arrays', () => {
    const state = simulate('() => { this.state.items.push("c"); }', { items: ['a', 'b'] });
    expect(state.items).toEqual(['a', 'b', 'c']);
  });

  it('compiled pop works on arrays', () => {
    const state = simulate('() => { this.state.items.pop(); }', { items: ['a', 'b', 'c'] });
    expect(state.items).toEqual(['a', 'b']);
  });

  it('compiled shift works on arrays', () => {
    const state = simulate('() => { this.state.items.shift(); }', { items: ['a', 'b', 'c'] });
    expect(state.items).toEqual(['b', 'c']);
  });

  it('compiled unshift works on arrays', () => {
    const state = simulate('() => { this.state.items.unshift(0); }', { items: ['b', 'c'] });
    expect(state.items).toEqual([0, 'b', 'c']);
  });

  it('compiled splice works on arrays', () => {
    const state = simulate('() => { this.state.items.splice(1, 1, "x"); }', { items: ['a', 'b', 'c'] });
    expect(state.items).toEqual(['a', 'x', 'c']);
  });

  it('compiled splice without deleteCount removes to end', () => {
    const state = simulate('() => { this.state.items.splice(1); }', { items: ['a', 'b', 'c'] });
    expect(state.items).toEqual(['a']);
  });

  it('compiled splice with zero deleteCount inserts only', () => {
    const state = simulate('() => { this.state.items.splice(1, 0, "x"); }', { items: ['a', 'b', 'c'] });
    expect(state.items).toEqual(['a', 'x', 'b', 'c']);
  });

  it('compiled sort keeps array type', () => {
    const state = simulate('() => { this.state.items.sort(); }', { items: [3, 1, 2] });
    expect(state.items).toEqual([1, 2, 3]);
    expect(Array.isArray(state.items)).toBe(true);
  });

  it('compiled delete removes nested key', () => {
    const state = simulate('() => { delete this.state.deep.nested; }', { deep: { nested: 1, other: 2 } });
    expect(state.deep).toEqual({ other: 2 });
  });

  it('compiled nested assignment updates nested object', () => {
    const state = simulate('() => { this.state.form.name = "x"; }', { form: { name: 'old', age: 1 } });
    expect(state.form).toEqual({ name: 'x', age: 1 });
  });

  it('compiled numeric index assignment updates array element', () => {
    const state = simulate('() => { this.state.form.fields[0].name = "z"; }', {
      form: { fields: [{ name: 'a' }, { name: 'b' }] },
    });
    expect(state.form.fields).toEqual([{ name: 'z' }, { name: 'b' }]);
    expect(Array.isArray(state.form.fields)).toBe(true);
  });

  it('compiled Object.assign merges into state', () => {
    const state = simulate('() => { Object.assign(this.state.form, { age: 2 }); }', { form: { name: 'a' } });
    expect(state.form).toEqual({ name: 'a', age: 2 });
  });

  it('compiled ++ updates count', () => {
    const state = simulate('() => { this.state.count++; }', { count: 1 });
    expect(state.count).toBe(2);
  });

  it('compiled += updates count', () => {
    const state = simulate('() => { this.state.count += 2; }', { count: 1 });
    expect(state.count).toBe(3);
  });
});
