import { describe, expect, it } from 'vitest';
import { transformStateMutations } from '../src/engine/transform-state-mutations';

describe('transformStateMutations', () => {
  it('compiles a simple assignment into __setState/__setIn', () => {
    const result = transformStateMutations('() => { this.state.count = 5; }');
    expect(result).toContain('this.__setState(prev => this.__setIn(prev, ["count"], 5))');
  });

  it('compiles compound assignment using the previous value', () => {
    const result = transformStateMutations('() => { this.state.count += 1; return this.state.count; }');
    expect(result).toContain('this.__setState(prev => this.__setIn(prev, ["count"], prev["count"] + 1))');
    expect(result).toContain('return this.state.count');
  });

  it('compiles nested object path assignment', () => {
    const result = transformStateMutations('() => { this.state.form.name = "x"; }');
    expect(result).toContain('this.__setIn(prev, ["form", "name"], "x")');
  });

  it('compiles computed key path assignment', () => {
    const result = transformStateMutations('() => { this.state.form[field].name = v; }');
    expect(result).toContain('this.__setIn(prev, ["form", field, "name"], v)');
  });

  it('compiles numeric index path assignment', () => {
    const result = transformStateMutations('() => { this.state.form.fields[0].name = "x"; }');
    expect(result).toContain('this.__setIn(prev, ["form", "fields", 0, "name"], "x")');
  });

  it('compiles update expression', () => {
    const result = transformStateMutations('() => { this.state.count++; }');
    expect(result).toContain('this.__setIn(prev, ["count"], prev["count"] + 1)');
  });

  it('compiles delete into setIn with undefined', () => {
    const result = transformStateMutations('() => { delete this.state.obsolete; }');
    expect(result).toContain('this.__setIn(prev, ["obsolete"], undefined)');
  });

  it('compiles Object.assign mutation', () => {
    const result = transformStateMutations('() => { Object.assign(this.state.form, payload); }');
    expect(result).toContain('this.__setIn(prev, ["form"], {');
    expect(result).toContain('...prev["form"]');
    expect(result).toContain('...payload');
  });

  it('compiles array push mutation', () => {
    const result = transformStateMutations('() => { this.state.items.push("c"); }');
    expect(result).toContain('this.__setIn(prev, ["items"], [...prev["items"], "c"])');
  });

  it('keeps reads untouched', () => {
    const result = transformStateMutations('() => { return this.state.count + 1; }');
    expect(result).not.toContain('__setState');
    expect(result).not.toContain('__setIn');
    expect(result).toContain('return this.state.count + 1');
  });

  it('rejects state writes evaluated directly by a render expression', () => {
    expect(transformStateMutations('this.state.count++')).toBe('this.__rejectStateMutationDuringRender()');
  });

  it('returns source unchanged for expression without this.state', () => {
    const source = '() => 1 + 1';
    expect(transformStateMutations(source)).toBe(source);
  });
});
