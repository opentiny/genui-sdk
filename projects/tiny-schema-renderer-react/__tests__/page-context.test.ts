import { describe, it, expect } from 'vitest';
import { parseData } from '../src/engine';
import { createContextApi } from './render-context-api';
import { setSchema } from '../src/set-schema';

describe('setSchema', () => {
  it('methods execute with latest context via parsed.call(contextApi.getContext())', () => {
    const contextApi = createContextApi();
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
      contextApi,
    );

    expect((contextApi.getContext().handleSubmit as () => string)()).toBe('test');
  });

  it('resolves callAction injected after methods were parsed', () => {
    const contextApi = createContextApi();
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
      contextApi,
    );

    contextApi.setContext({
      callAction: (name: string) => (name === 'saveState' ? 'saved' : undefined),
    });

    expect(typeof contextApi.getContext().callAction).toBe('function');
    expect((contextApi.getContext().handleSubmit as () => string)()).toBe('saved');
  });

  it('setSchema clears external context until re-injected', () => {
    const contextApi = createContextApi();
    contextApi.setContext({
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
      contextApi,
    );

    expect(contextApi.getContext().callAction).toBeUndefined();
    expect(contextApi.getContext().cardId).toBeUndefined();

    contextApi.setContext({
      callAction: (name: string) => (name === 'saveState' ? 'saved' : undefined),
      cardId: 'card-1',
    });

    expect((contextApi.getContext().handleSubmit as () => string)()).toBe('saved');
  });

  it('resetForm-style state assignment triggers re-render snapshot change', () => {
    const contextApi = createContextApi();
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
      contextApi,
    );

    const before = contextApi.getContext();
    (contextApi.getContext().resetForm as () => void)();
    const after = contextApi.getContext();

    expect(after.state?.formData).toEqual({ name: '' });
    expect(after).not.toBe(before);
  });

  it('onMounted state mutation triggers re-render after lifecycle completes', async () => {
    const contextApi = createContextApi();
    const before = contextApi.getContext();

    const { onMounted } = setSchema(
      {
        state: { tableData: [] as unknown[] },
        lifeCycles: {
          onMounted: {
            type: 'JSFunction',
            value: "function onMounted() { this.state.tableData = [{ id: '001' }]; }",
          },
        },
        componentName: 'Page',
        children: [],
      },
      contextApi,
    );

    await onMounted?.();

    expect(contextApi.getContext().state?.tableData).toEqual([{ id: '001' }]);
    expect(contextApi.getContext()).not.toBe(before);
  });

  it('updates after await without method or event wrapper notifications', async () => {
    const contextApi = createContextApi();
    setSchema(
      {
        state: { loading: true, result: null },
        methods: {
          load: {
            type: 'JSFunction',
            value: "async function() { await Promise.resolve(); this.state.loading = false; this.state.result = 'done'; }",
          },
        },
        componentName: 'Page',
        children: [],
      },
      contextApi,
    );

    const before = contextApi.getContext();
    await (contextApi.getContext().load as () => Promise<void>)();

    expect(contextApi.getContext().state).toEqual({ loading: false, result: 'done' });
    expect(contextApi.getContext()).not.toBe(before);
  });

  it('updates from a timer callback after the method has returned', async () => {
    const contextApi = createContextApi();
    setSchema(
      {
        state: { ready: false },
        methods: {
          start: {
            type: 'JSFunction',
            value:
              "function() { return new Promise((resolve) => setTimeout(() => { this.state.ready = true; resolve(); }, 0)); }",
          },
        },
        componentName: 'Page',
        children: [],
      },
      contextApi,
    );

    await (contextApi.getContext().start as () => Promise<void>)();

    expect(contextApi.getContext().state).toEqual({ ready: true });
  });

  it('does not notify for a method that does not change state', () => {
    const contextApi = createContextApi();
    setSchema(
      {
        methods: {
          readOnly: { type: 'JSFunction', value: "function() { return 'ok'; }" },
        },
        componentName: 'Page',
        children: [],
      },
      contextApi,
    );

    const before = contextApi.getContext();

    expect((contextApi.getContext().readOnly as () => string)()).toBe('ok');
    expect(contextApi.getContext()).toBe(before);
  });

  it('compiles update, delete, Object.assign and array mutation writes', () => {
    const contextApi = createContextApi();
    setSchema(
      {
        state: { count: 1, form: { name: 'Ada' }, items: ['a', 'b'], obsolete: true },
        methods: {
          update: {
            type: 'JSFunction',
            value:
              "function() { this.state.count++; Object.assign(this.state.form, { name: 'Grace' }); this.state.items.push('c'); delete this.state.obsolete; }",
          },
        },
        componentName: 'Page',
        children: [],
      },
      contextApi,
    );

    (contextApi.getContext().update as () => void)();

    expect(contextApi.getContext().state).toEqual({ count: 2, form: { name: 'Grace' }, items: ['a', 'b', 'c'] });
  });
});

describe('parseData onClick with methods', () => {
  it('onClick handler can call this.handleSubmit()', () => {
    const contextApi = createContextApi();
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
      contextApi,
    );

    const ctx = contextApi.getContext();
    const onClick = parseData(
      { type: 'JSFunction', value: 'function() { return this.handleSubmit(); }' },
      {},
      ctx,
    ) as () => string;

    expect(onClick()).toBe('ok');
  });
});
