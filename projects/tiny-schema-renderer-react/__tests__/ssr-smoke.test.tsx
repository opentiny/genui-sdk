// @vitest-environment node

import React from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SchemaRenderer } from '../src/RenderMain';
import { RendererContextProvider } from '../src/RendererContextProvider';

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

  it('renders blocks with slots on the server', () => {
    const schema = {
      componentName: 'Page',
      children: [
        {
          componentName: 'InfoCard',
          props: {
            title: 'SSR block',
            header: {
              type: 'JSSlot',
              value: [{ componentName: 'Text', props: { text: 'slot content' } }],
            },
          },
        },
      ],
    };
    const blocks = {
      InfoCard: {
        componentName: 'InfoCard',
        schema: {
          properties: [{ content: [{ property: 'title', type: 'string' }] }],
          slots: { header: { description: { zh_CN: '头部' } } },
        },
        children: [
          { componentName: 'Text', props: { text: { type: 'JSExpression', value: 'this.props.title' } } },
          {
            componentName: 'Slot',
            props: { name: 'header' },
            children: [{ componentName: 'Text', props: { text: 'fallback' } }],
          },
        ],
      },
    };

    const html = renderToString(
      React.createElement(
        RendererContextProvider,
        { renderSettings: { materials: { components: {}, blocks } } },
        React.createElement(SchemaRenderer, { schema }),
      ),
    );

    expect(html).toContain('SSR block');
    expect(html).toContain('slot content');
    expect(html).not.toContain('fallback');
  });
});
