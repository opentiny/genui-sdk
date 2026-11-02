import { createElement, isValidElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { parseData } from '../src/engine';
import { setCustomSettings } from '../src/engine/use-custom-setting';
import { MATERIALS } from '../src/materials';
import { transformJSX } from '../src/transform-jsx';

function AntButton(props: Record<string, unknown>) {
  return createElement('button', props);
}

describe('parse JSX function', () => {
  afterEach(() => {
    setCustomSettings({});
  });

  it('compiles JSFunction JSX through transformJSX and this.getComponent', () => {
    setCustomSettings({ transformJSX });
    const ctx = {
      [MATERIALS]: { components: { AntButton } },
      removeRow: (id: string) => id,
    };

    const render = parseData(
      {
        type: 'JSFunction',
        value: 'function render(_, row) { return <AntButton type="primary" danger>删除</AntButton> }',
      },
      {},
      ctx,
    ) as (...args: unknown[]) => unknown;

    const element = render(undefined, { id: '1' });
    expect(isValidElement(element)).toBe(true);
    expect((element as { type: unknown }).type).toBe(AntButton);
    expect((element as { props: { type?: string; danger?: boolean; children?: string } }).props.type).toBe('primary');
    expect((element as { props: { children?: string } }).props.children).toBe('删除');
  });

  it('does not rewrite h(Component) text inside JSX strings', () => {
    setCustomSettings({ transformJSX });
    const ctx = {
      [MATERIALS]: { components: { AntButton } },
    };

    const render = parseData(
      {
        type: 'JSFunction',
        value: 'function render() { return <AntButton>h(Foo)</AntButton> }',
      },
      {},
      ctx,
    ) as () => { props: { children?: string } };

    expect(render().props.children).toBe('h(Foo)');
  });

  it.todo('prefers transformJSX from page context over global settings');
});
