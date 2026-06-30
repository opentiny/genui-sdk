import { describe, it, expect } from 'vitest';
import { parseData } from '../src/engine';
import type { PageContextValue } from '../src/engine/parse-data';

describe('model input binding', () => {
  it('updates state and notifies on explicit value/onChange', () => {
    let context: PageContextValue = {
      state: { formData: { name: '' } },
      refs: {},
      methods: {},
    };
    let notifyCount = 0;
    const getRuntimeContext = () => context;
    context.__getContext = getRuntimeContext;
    context.__pageNotify = () => {
      notifyCount += 1;
      context = { ...context, __getContext: getRuntimeContext, __pageNotify: context.__pageNotify };
    };

    const props = parseData(
      {
        placeholder: 'name',
        value: {
          type: 'JSExpression',
          value: 'this.state.formData.name',
        },
        onChange: {
          type: 'JSFunction',
          value: 'function(e) { this.state.formData.name = e.target.value; }',
        },
      },
      {},
      context,
    ) as { value: string; onChange: (e: { target: { value: string } }) => void };

    expect(props.value).toBe('');

    props.onChange({ target: { value: 'a' } });
    expect(context.state?.formData).toEqual({ name: 'a' });
    expect(notifyCount).toBe(1);

    const nextCtx = context.__getContext?.() ?? context;
    const nextProps = parseData(
      {
        value: {
          type: 'JSExpression',
          value: 'this.state.formData.name',
        },
      },
      {},
      nextCtx,
    ) as { value: string };

    expect(nextProps.value).toBe('a');
  });
});
