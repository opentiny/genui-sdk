import { createElement, createRef, useCallback, useRef } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SchemaRenderer, type SchemaRendererHandle } from '../src/RenderMain';

const schema = {
  componentName: 'Page',
  children: [{ componentName: 'div', children: [] }],
};

function Host() {
  const rendererRef = useRef<SchemaRendererHandle | null>(null);
  const setRendererRef = useCallback((instance: SchemaRendererHandle | null) => {
    rendererRef.current = instance;
    if (!instance) return;
    instance.setContext({
      callAction: () => undefined,
    });
    instance.setState({});
  }, []);

  return createElement(SchemaRenderer, { ref: setRendererRef, schema });
}

describe('SchemaRenderer callback ref', () => {
  it('does not loop when parent injects context from the ref callback', () => {
    expect(() => render(createElement(Host))).not.toThrow();
  });

  it('preserves runtime state when only the schema object identity changes', async () => {
    const rendererRef = createRef<SchemaRendererHandle>();
    const schema = {
      componentName: 'Page',
      state: { count: 0 },
      children: [{ componentName: 'div' }],
    };
    const { rerender } = render(createElement(SchemaRenderer, { ref: rendererRef, schema }));

    await waitFor(() => expect(rendererRef.current?.getContext().state).toEqual({ count: 0 }));
    act(() => rendererRef.current?.setState({ count: 1 }));

    rerender(
      createElement(SchemaRenderer, {
        ref: rendererRef,
        schema: { ...schema, children: [{ componentName: 'span' }] },
      }),
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 0)));

    expect(rendererRef.current?.getContext().state).toEqual({ count: 1 });
  });

  it('preserves host actions injected before schema initialization completes', async () => {
    const rendererRef = createRef<SchemaRendererHandle>();
    const callAction = (name: string) => (name === 'save' ? 'saved' : undefined);
    const setRendererRef = (instance: SchemaRendererHandle | null) => {
      rendererRef.current = instance;
      instance?.setContext({ callAction });
    };
    const schema = {
      componentName: 'Page',
      methods: {
        submit: {
          type: 'JSFunction' as const,
          value: "function() { return this.callAction('save'); }",
        },
      },
      children: [{ componentName: 'div' }],
    };

    render(createElement(SchemaRenderer, { ref: setRendererRef, schema }));
    await waitFor(() => expect(typeof rendererRef.current?.getContext().submit).toBe('function'));

    expect((rendererRef.current?.getContext().submit as () => string)()).toBe('saved');
  });
});
