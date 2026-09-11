import { describe, it, expect } from 'vitest';
import { parseData } from '../src/engine';
import { createContextApi } from './render-context-api';
import { setSchema } from '../src/set-schema';
import bindThisSchema from '../test/mock/bind-this.json';

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

  it('setSchema preserves host context while replacing schema methods', () => {
    const contextApi = createContextApi();
    const callAction = (name: string) => name;
    contextApi.setContext({ callAction, cardId: 'card-1' });

    setSchema(
      {
        methods: {
          oldMethod: {
            type: 'JSFunction',
            value: "function() { return this.callAction('saveState'); }",
          },
        },
        componentName: 'Page',
        children: [],
      },
      contextApi,
    );

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

    expect(contextApi.getContext().callAction).toBe(callAction);
    expect(contextApi.getContext().cardId).toBe('card-1');
    expect(contextApi.getContext().oldMethod).toBeUndefined();
    expect((contextApi.getContext().handleSubmit as () => string)()).toBe('saveState');
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

describe('bind this after context refresh', () => {
  it('arrow method reads latest state after setContext', () => {
    const contextApi = createContextApi();
    setSchema(
      {
        state: { count: 1 },
        methods: {
          getCount: {
            type: 'JSFunction',
            value: '() => this.state.count',
          },
        },
        componentName: 'Page',
        children: [],
      },
      contextApi,
    );

    expect((contextApi.getContext().getCount as () => number)()).toBe(1);

    contextApi.setContext({ state: { count: 2 } });

    expect((contextApi.getContext().getCount as () => number)()).toBe(2);
  });

  it('scoped loop handler keeps this after parent state refresh', () => {
    const contextApi = createContextApi();
    setSchema(
      {
        state: { prefix: 'A' },
        componentName: 'Page',
        children: [],
      },
      contextApi,
    );

    const onClick = parseData(
      { type: 'JSFunction', value: '() => this.state.prefix + item' },
      { item: '-1' },
      contextApi.getContext(),
    ) as () => string;

    expect(onClick()).toBe('A-1');

    contextApi.setContext({ state: { prefix: 'B' } });

    expect(onClick()).toBe('B-1');
  });

  it('does not resolve stale ctx fields from with-scope after refresh', () => {
    const contextApi = createContextApi();
    setSchema(
      {
        state: { count: 1 },
        methods: {
          readCount: {
            type: 'JSFunction',
            value: 'function() { return this.state.count; }',
          },
        },
        componentName: 'Page',
        children: [],
      },
      contextApi,
    );

    const expr = parseData(
      { type: 'JSExpression', value: '(function() { return this.state.count; }).bind(this)' },
      {},
      contextApi.getContext(),
    ) as () => number;

    expect(expr()).toBe(1);

    contextApi.setContext({ state: { count: 9 } });

    expect(expr()).toBe(9);
    expect((contextApi.getContext().readCount as () => number)()).toBe(9);
  });

  it('mock bind-this schema keeps arrow this after refresh', () => {
    const contextApi = createContextApi();
    setSchema(bindThisSchema as Parameters<typeof setSchema>[0], contextApi);

    const ctx = () => contextApi.getContext();
    (ctx().bump as () => void)();
    (ctx().readCount as () => void)();

    expect(ctx().state?.count).toBe(2);
    expect(ctx().state?.log).toBe('箭头 this.state.count = 2');

    (ctx().togglePrefix as () => void)();
    const markBanana = parseData(
      { type: 'JSFunction', value: "() => { this.state.log = this.state.prefix + '-' + item.name; }" },
      { item: { name: '香蕉' } },
      ctx(),
    ) as () => void;
    markBanana();

    expect(ctx().state?.prefix).toBe('B');
    expect(ctx().state?.log).toBe('B-香蕉');
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
