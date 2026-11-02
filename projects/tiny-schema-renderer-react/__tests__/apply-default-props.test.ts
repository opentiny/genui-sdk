import { describe, expect, it } from 'vitest';
import { applyDefaultPropsToProps } from '../src/engine/apply-default-props';

describe('applyDefaultPropsToProps', () => {
  it('fills missing leaf props without overwriting existing values', () => {
    const props: Record<string, unknown> = { size: 'large' };
    const defaultPropsMap = {
      Button: {
        size: 'medium',
        type: 'primary',
      },
    };

    applyDefaultPropsToProps('Button', props, defaultPropsMap);

    expect(props).toEqual({ size: 'large', type: 'primary' });
  });

  it('does not create missing intermediate objects', () => {
    const props: Record<string, unknown> = {};
    const defaultPropsMap = {
      Select: {
        'options.0.label': 'Default',
      },
    };

    applyDefaultPropsToProps('Select', props, defaultPropsMap);

    expect(props).toEqual({});
  });

  it('fills nested paths and array wildcard when containers already exist', () => {
    const props: Record<string, unknown> = {
      options: [{ value: 'a' }, { value: 'b', label: 'B' }],
    };
    const defaultPropsMap = {
      Select: {
        'options.*.label': 'Default',
      },
    };

    applyDefaultPropsToProps('Select', props, defaultPropsMap);

    expect(props).toEqual({
      options: [
        { value: 'a', label: 'Default' },
        { value: 'b', label: 'B' },
      ],
    });
  });

  it('ignores unknown components and invalid maps', () => {
    const props: Record<string, unknown> = {};

    applyDefaultPropsToProps('Button', props, null);
    applyDefaultPropsToProps('Button', props, undefined);
    applyDefaultPropsToProps(123 as unknown as string, props, { Button: { type: 'primary' } });

    expect(props).toEqual({});
  });
});
