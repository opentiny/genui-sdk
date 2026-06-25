import { describe, it, expect } from 'vitest';
import { parseData } from '../src/engine';
import { createPageContext } from '../src/use-context';
import { setSchema } from '../src/set-schema';

describe('setSchema', () => {
  it('methods execute with latest context via parsed.call(page.getContext())', () => {
    const page = createPageContext();
    setSchema(
      {
        state: { formData: { name: 'test' } },
        methods: {
          handleSubmit: {
            type: 'JSFunction',
            value: 'function() { return this.state.formData.name; }',
          },
        },
        componentName: 'Page',
        children: [],
      },
      page,
    );

    expect((page.getContext().handleSubmit as () => string)()).toBe('test');
  });

  it('resolves callAction injected after methods were parsed', () => {
    const page = createPageContext();
    setSchema(
      {
        methods: {
          handleSubmit: {
            type: 'JSFunction',
            value: "function() { return this.callAction('saveState'); }",
          },
        },
        componentName: 'Page',
        children: [],
      },
      page,
    );

    page.setContext({
      callAction: (name: string) => (name === 'saveState' ? 'saved' : undefined),
    });

    expect(typeof page.getContext().callAction).toBe('function');
    expect((page.getContext().handleSubmit as () => string)()).toBe('saved');
  });

  it('setSchema clears external context until re-injected', () => {
    const page = createPageContext();
    page.setContext({
      callAction: (name: string) => name,
      cardId: 'card-1',
    });

    setSchema(
      {
        methods: {
          handleSubmit: {
            type: 'JSFunction',
            value: "function() { return this.callAction('saveState'); }",
          },
        },
        componentName: 'Page',
        children: [],
      },
      page,
    );

    expect(page.getContext().callAction).toBeUndefined();
    expect(page.getContext().cardId).toBeUndefined();

    page.setContext({
      callAction: (name: string) => (name === 'saveState' ? 'saved' : undefined),
      cardId: 'card-1',
    });

    expect((page.getContext().handleSubmit as () => string)()).toBe('saved');
  });

  it('resetForm-style state assignment triggers re-render snapshot change', () => {
    const page = createPageContext();
    setSchema(
      {
        state: { formData: { name: 'test' } },
        methods: {
          resetForm: {
            type: 'JSFunction',
            value: "function() { this.state.formData = { name: '' }; }",
          },
        },
        componentName: 'Page',
        children: [],
      },
      page,
    );

    const before = page.getContext();
    (page.getContext().resetForm as () => void)();
    const after = page.getContext();

    expect(after.state?.formData).toEqual({ name: '' });
    expect(after).not.toBe(before);
  });
});

describe('parseData onClick with methods', () => {
  it('onClick handler can call this.handleSubmit()', () => {
    const page = createPageContext();
    setSchema(
      {
        methods: {
          handleSubmit: {
            type: 'JSFunction',
            value: "function() { return 'ok'; }",
          },
        },
        componentName: 'Page',
        children: [],
      },
      page,
    );

    const ctx = page.getContext();
    const onClick = parseData(
      { type: 'JSFunction', value: 'function() { return this.handleSubmit(); }' },
      {},
      ctx,
    ) as () => string;

    expect(onClick()).toBe('ok');
  });
});
