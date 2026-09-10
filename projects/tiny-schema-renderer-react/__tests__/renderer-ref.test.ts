import { createElement, useCallback, useRef } from 'react';
import { render } from '@testing-library/react';
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
});
