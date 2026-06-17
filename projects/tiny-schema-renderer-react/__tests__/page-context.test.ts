import { describe, it, expect } from 'vitest';
import { parseData } from '../src/engine';
import { initPageFromSchema, type RendererContextStore } from '../src/context';

function createMockStore(): RendererContextStore {
  let context: Record<string, unknown> = {
    state: {},
    refs: {},
    methods: {},
    cssScopeId: 'test-scope',
    callAction: () => 'called',
  };
  const getRuntimeContext = () => context as never;
  context.__getContext = getRuntimeContext;
  const notify = () => {
    context = { ...context, __getContext: getRuntimeContext };
  };
  context.__pageNotify = notify;

  return {
    getContext: () => context as never,
    setContext: (ctx, clear) => {
      if (clear) {
        context = { state: {}, refs: {}, methods: {}, ...ctx };
      } else {
        Object.assign(context, ctx);
      }
      context.__getContext = getRuntimeContext;
      context.__pageNotify = notify;
    },
    setState: (data, clear) => {
      if (clear) context.state = {};
      Object.assign(context.state as object, data);
      notify();
    },
    subscribe: () => () => {},
    invokePageOnUnmounted: async () => {},
    runPendingOnMounted: async () => {},
    schedulePageLifeCycles: () => {},
  };
}

describe('initPageFromSchema', () => {
  it('methods execute with latest context via parsed.call(store.getContext())', () => {
    const store = createMockStore();
    initPageFromSchema(
      {
        state: { formData: { name: 'test' } },
        methods: {
          handleSubmit: {
            type: 'JSFunction',
            value: "function() { return this.state.formData.name; }",
          },
        },
        componentName: 'Page',
        children: [],
      },
      store,
    );

    expect((store.getContext().handleSubmit as () => string)()).toBe('test');
  });

  it('resolves callAction injected after methods were parsed', () => {
    const store = createMockStore();
    initPageFromSchema(
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
      store,
    );

    store.setContext({
      callAction: (name: string) => (name === 'saveState' ? 'saved' : undefined),
    });

    expect(typeof store.getContext().callAction).toBe('function');
    expect((store.getContext().handleSubmit as () => string)()).toBe('saved');
  });

  it('resetForm-style state assignment triggers re-render snapshot change', () => {
    const store = createMockStore();
    initPageFromSchema(
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
      store,
    );

    const before = store.getContext();
    (store.getContext().resetForm as () => void)();
    const after = store.getContext();

    expect(after.state?.formData).toEqual({ name: '' });
    expect(after).not.toBe(before);
  });
});

describe('parseData onClick with methods', () => {
  it('onClick handler can call this.handleSubmit()', () => {
    const store = createMockStore();
    initPageFromSchema(
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
      store,
    );

    const ctx = store.getContext();
    const onClick = parseData(
      { type: 'JSFunction', value: 'function() { return this.handleSubmit(); }' },
      {},
      ctx,
    ) as () => string;

    expect(onClick()).toBe('ok');
  });
});
