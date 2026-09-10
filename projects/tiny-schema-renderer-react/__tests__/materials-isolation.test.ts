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
          { 'render-settings': { materials: { components: { Mark: LabelA } } } },
          createElement(SchemaRenderer, { schema }),
        ),
        createElement(
          RendererContextProvider,
          { 'render-settings': { materials: { components: { Mark: LabelB } } } },
          createElement(SchemaRenderer, { schema }),
        ),
      ),
    );

    expect(container.textContent).toContain('A-MAT');
    expect(container.textContent).toContain('B-MAT');
  });
});
