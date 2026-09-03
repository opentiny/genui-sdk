import { describe, it, expect } from 'vitest';
import { parseData } from '../src/engine';
import { setState } from '../src/set-schema';
import { createContextApi } from './render-context-api';

describe('model input binding', () => {
  it('updates state and notifies on explicit value/onChange', () => {
    const contextApi = createContextApi();
    setState({ formData: { name: '' } }, contextApi);

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
      contextApi.getContext(),
    ) as { value: string; onChange: (e: { target: { value: string } }) => void };

    expect(props.value).toBe('');

    const before = contextApi.getContext();
    props.onChange({ target: { value: 'a' } });
    expect(contextApi.getContext().state?.formData).toEqual({ name: 'a' });
    expect(contextApi.getContext()).not.toBe(before);

    const nextProps = parseData(
      {
        value: {
          type: 'JSExpression',
          value: 'this.state.formData.name',
        },
      },
      {},
      contextApi.getContext(),
    ) as { value: string };

    expect(nextProps.value).toBe('a');
  });

  it('updates state from an inline JSExpression event function', () => {
    const contextApi = createContextApi();
    setState({ count: 0 }, contextApi);

    const onClick = parseData(
      {
        type: 'JSExpression',
        value: '(value) => { this.state.count = value; }',
      },
      {},
      contextApi.getContext(),
    ) as (value: number) => void;

    onClick(2);

    expect(contextApi.getContext().state).toEqual({ count: 2 });
  });
});
