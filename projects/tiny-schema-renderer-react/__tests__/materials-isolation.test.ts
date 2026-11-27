import { createElement, Fragment } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SchemaRenderer } from '../src/RenderMain';
import { RendererContextProvider } from '../src/RendererContextProvider';

const schema = {
  componentName: 'Page',
  children: [{ componentName: 'Mark' }],
};

function LabelA() {
  return createElement('span', null, 'A-MAT');
}

function LabelB() {
  return createElement('span', null, 'B-MAT');
}

describe('SchemaRenderer materials isolation', () => {
  it('does not share materials across renderer instances', () => {
    const { container } = render(
      createElement(
        Fragment,
        null,
        createElement(
          RendererContextProvider,
          { renderSettings: { materials: { components: { Mark: LabelA } } } },
          createElement(SchemaRenderer, { schema }),
        ),
        createElement(
          RendererContextProvider,
          { renderSettings: { materials: { components: { Mark: LabelB } } } },
          createElement(SchemaRenderer, { schema }),
        ),
      ),
    );

    expect(container.textContent).toContain('A-MAT');
    expect(container.textContent).toContain('B-MAT');
  });

  it('uses utils during initial render and refreshes them with materials', () => {
    const utilsSchema = {
      componentName: 'Page',
      state: { amount: 2 },
      children: [
        {
          componentName: 'Text',
          props: {
            text: { type: 'JSExpression', value: 'this.utils.format(this.state.amount)' },
          },
        },
      ],
    } as const;
    const renderPage = (format: (value: unknown) => string) =>
      createElement(
        RendererContextProvider,
        { renderSettings: { materials: { utils: { format } } } },
        createElement(SchemaRenderer, { schema: utilsSchema }),
      );

    const { container, rerender } = render(renderPage((value) => `A:${String(value)}`));
    expect(container.textContent).toBe('A:2');

    rerender(renderPage((value) => `B:${String(value)}`));
    expect(container.textContent).toBe('B:2');
  });
});
