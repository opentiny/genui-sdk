import { createElement } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SchemaRenderer } from '../src/RenderMain';
import { RendererContextProvider } from '../src/RendererContextProvider';

function Boom(): never {
  throw new Error('isValid is not a function');
}

describe('SchemaRenderer error boundary', () => {
  it('contains render errors at the renderer root without crashing the host', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      createElement(
        'div',
        { 'data-testid': 'host' },
        createElement(
          RendererContextProvider,
          { 'render-settings': { materials: { components: { Boom } } } },
          createElement(SchemaRenderer, {
            schema: {
              componentName: 'Page',
              children: [{ componentName: 'Boom' }],
            },
          }),
        ),
      ),
    );

    expect(screen.getByTestId('host')).toBeTruthy();
    expect(screen.getByText(/Page failed to render: isValid is not a function/)).toBeTruthy();
    errorSpy.mockRestore();
  });

  it('retries rendering after the schema changes', () => {
    cleanup();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function Ok() {
      return createElement('span', null, 'recovered');
    }

    const { rerender, container } = render(
      createElement(
        RendererContextProvider,
        { 'render-settings': { materials: { components: { Boom, Ok } } } },
        createElement(SchemaRenderer, {
          schema: {
            componentName: 'Page',
            children: [{ componentName: 'Boom' }],
          },
        }),
      ),
    );

    expect(container.querySelector('[data-tag="schema-error"]')?.textContent).toContain(
      'isValid is not a function',
    );

    rerender(
      createElement(
        RendererContextProvider,
        { 'render-settings': { materials: { components: { Boom, Ok } } } },
        createElement(SchemaRenderer, {
          schema: {
            componentName: 'Page',
            children: [{ componentName: 'Ok' }],
          },
        }),
      ),
    );

    expect(container.textContent).toContain('recovered');
    expect(container.querySelector('[data-tag="schema-error"]')).toBeNull();
    errorSpy.mockRestore();
  });
});
