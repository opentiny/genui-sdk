import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
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
});
