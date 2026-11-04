// @vitest-environment node

import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SchemaRenderer } from '../src/RenderMain';

describe('SchemaRenderer SSR', () => {
  it('renders the current schema protocol on the server', () => {
    const schema = {
      componentName: 'Page',
      children: [
        {
          componentName: 'Text',
          props: { text: 'hello from SSR' },
        },
      ],
    };

    const html = renderToString(React.createElement(SchemaRenderer, { schema }));

    expect(html).toContain('hello from SSR');
  });
});
