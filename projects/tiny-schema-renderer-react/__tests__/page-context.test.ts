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

  it('onMounted state mutation triggers re-render after lifecycle completes', async () => {
    const page = createPageContext();
    let notifyCount = 0;
    page.subscribe(() => notifyCount++);

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
      page,
    );

    const notifyAfterInit = notifyCount;
    await onMounted?.();

    expect(page.getContext().state?.tableData).toEqual([{ id: '001' }]);
    expect(notifyCount).toBeGreaterThan(notifyAfterInit);
  });

  it('updates after await without method or event wrapper notifications', async () => {
    const page = createPageContext();
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
      page,
    );

    let notifyCount = 0;
    page.subscribe(() => notifyCount++);
    await (page.getContext().load as () => Promise<void>)();

    expect(page.getContext().state).toEqual({ loading: false, result: 'done' });
    expect(notifyCount).toBe(2);
  });

  it('updates from a timer callback after the method has returned', async () => {
    const page = createPageContext();
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
      page,
    );

    await (page.getContext().start as () => Promise<void>)();

    expect(page.getContext().state).toEqual({ ready: true });
  });

  it('does not notify for a method that does not change state', () => {
    const page = createPageContext();
    setSchema(
      {
        methods: {
          readOnly: { type: 'JSFunction', value: "function() { return 'ok'; }" },
        },
        componentName: 'Page',
        children: [],
      },
      page,
    );

    let notifyCount = 0;
    page.subscribe(() => notifyCount++);

    expect((page.getContext().readOnly as () => string)()).toBe('ok');
    expect(notifyCount).toBe(0);
  });

  it('compiles update, delete, Object.assign and array mutation writes', () => {
    const page = createPageContext();
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
      page,
    );

    (page.getContext().update as () => void)();

    expect(page.getContext().state).toEqual({ count: 2, form: { name: 'Grace' }, items: ['a', 'b', 'c'] });
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
