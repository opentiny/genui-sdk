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

  it('fills nested paths when intermediate objects are missing', () => {
    const props: Record<string, unknown> = {};
    const defaultPropsMap = {
      Select: {
        'options.0.label': 'Default',
      },
    };

    applyDefaultPropsToProps('Select', props, defaultPropsMap);

    expect(props).toEqual({ options: { '0': { label: 'Default' } } });
  });

  it('ignores unknown components and invalid maps', () => {
    const props: Record<string, unknown> = {};

    applyDefaultPropsToProps('Button', props, null);
    applyDefaultPropsToProps('Button', props, undefined);
    applyDefaultPropsToProps(123 as unknown as string, props, { Button: { type: 'primary' } });

    expect(props).toEqual({});
  });
});
