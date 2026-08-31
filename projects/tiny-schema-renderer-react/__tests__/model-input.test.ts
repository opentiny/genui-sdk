import { describe, it, expect } from 'vitest';
import { parseData } from '../src/engine';
import { createPageContext } from '../src/use-context';

describe('model input binding', () => {
  it('updates state and notifies on explicit value/onChange', () => {
    const page = createPageContext();
    page.setState({ formData: { name: '' } });
    let notifyCount = 0;
    page.subscribe(() => notifyCount++);

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

    props.onChange({ target: { value: 'a' } });
    expect(page.getContext().state?.formData).toEqual({ name: 'a' });
    expect(notifyCount).toBe(1);

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
    page.setState({ count: 0 });

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
