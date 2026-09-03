import { describe, it, expect } from 'vitest';
import { parseData } from '../src/engine';
import { setState } from '../src/set-schema';
import { createPageContext } from './render-page-context';

describe('model input binding', () => {
  it('updates state and notifies on explicit value/onChange', () => {
    const page = createPageContext();
    setState({ formData: { name: '' } }, page);

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
      page.getContext(),
    ) as { value: string; onChange: (e: { target: { value: string } }) => void };

    expect(props.value).toBe('');

    const before = page.getContext();
    props.onChange({ target: { value: 'a' } });
    expect(page.getContext().state?.formData).toEqual({ name: 'a' });
    expect(page.getContext()).not.toBe(before);

    const nextProps = parseData(
      {
        value: {
          type: 'JSExpression',
          value: 'this.state.formData.name',
        },
      },
      {},
      page.getContext(),
    ) as { value: string };

    expect(nextProps.value).toBe('a');
  });

  it('updates state from an inline JSExpression event function', () => {
    const page = createPageContext();
    setState({ count: 0 }, page);

    const onClick = parseData(
      {
        type: 'JSExpression',
        value: '(value) => { this.state.count = value; }',
      },
      {},
      page.getContext(),
    ) as (value: number) => void;

    onClick(2);

    expect(page.getContext().state).toEqual({ count: 2 });
  });
});
