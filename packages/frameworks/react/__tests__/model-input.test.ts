import { describe, it, expect } from 'vitest';
import { parseData } from '../src/engine';
import { getRuntimeCtx } from '../src/engine/context-runtime';
import type { PageContextValue } from '../src/engine/types';

describe('model input binding', () => {
  it('updates state and notifies on input change', () => {
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
        modelValue: {
          type: 'JSExpression',
          model: true,
          value: 'this.state.formData.name',
        },
      },
      {},
      context,
    ) as { value: string; onChange: (e: { target: { value: string } }) => void };

    expect(props.value).toBe('');

    props.onChange({ target: { value: 'a' } });
    expect(context.state?.formData).toEqual({ name: 'a' });
    expect(notifyCount).toBe(1);

    const nextCtx = getRuntimeCtx(context);
    const nextProps = parseData(
      {
        modelValue: {
          type: 'JSExpression',
          model: true,
          value: 'this.state.formData.name',
        },
      },
      {},
      nextCtx,
    ) as { value: string };

    expect(nextProps.value).toBe('a');
  });
});
