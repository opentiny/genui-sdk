import { StrictMode, type ReactNode } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineBlock, getBlock, getSchemaIOKeys, loadBlock, type BlockSchema } from '../src/block';
import type { RootNode } from '../src/types';
import { SchemaRenderer } from '../src/RenderMain';
import { RendererContextProvider } from '../src/RendererContextProvider';

const cardBlock: BlockSchema = {
  componentName: 'InfoCard',
  state: { visits: 3 },
  inputs: { title: { type: 'string' } },
  outputs: { change: { type: 'number' } },
  children: [
    {
      componentName: 'Text',
      props: { className: 'block-title', text: { type: 'JSExpression', value: 'this.props.title' } },
    },
    {
      componentName: 'Text',
      props: {
        className: 'block-state',
        text: { type: 'JSExpression', value: '`visits:${this.state.visits}`' },
      },
    },
    {
      componentName: 'Slot',
      props: {
        name: 'header',
        params: [{ name: 'title', value: { type: 'JSExpression', value: 'this.props.title' } }],
      },
      children: [{ componentName: 'Text', props: { className: 'builtin-header', text: 'builtin-header' } }],
    },
    {
      componentName: 'Slot',
      props: { name: 'footer' },
    },
    {
      componentName: 'button',
      props: {
        'data-testid': 'increase',
        onClick: { type: 'JSFunction', value: 'function() { this.state.visits = this.state.visits + 1 }' },
      },
      children: 'increase',
    },
    {
      componentName: 'button',
      props: {
        'data-testid': 'notify',
        onClick: { type: 'JSFunction', value: "function() { this.dispatchEvent('change', this.state.visits) }" },
      },
      children: 'notify',
    },
  ],
};

function createPageSchema(children: RootNode['children']): RootNode {
  return {
    componentName: 'Page',
    state: { pageCount: 1 },
    children,
  };
}

function renderPage(schema: RootNode, wrapper?: (children: ReactNode) => ReactNode) {
  const tree = (
    <RendererContextProvider renderSettings={{ materials: { components: {}, blocks: { InfoCard: cardBlock } } }}>
      <SchemaRenderer schema={schema} />
    </RendererContextProvider>
  );
  return render(wrapper ? <>{wrapper(tree)}</> : tree);
}

describe('schema block', () => {
  afterEach(cleanup);

  beforeEach(() => {
    (globalThis as Record<string, unknown>).__blockChange = undefined;
  });

  it('renders block schema with this.props and its own state', () => {
    const { container } = renderPage(
      createPageSchema([
        {
          componentName: 'InfoCard',
          props: {
            title: 'Current',
            onChange: { type: 'JSFunction', value: 'function(value) { window.__blockChange = value }' },
          },
        },
      ]),
    );

    expect(container.querySelector('.block-title')?.textContent).toBe('Current');
    expect(container.querySelector('.block-state')?.textContent).toBe('visits:3');
    // 未提供 header 插槽时渲染区块内置的兜底内容
    expect(container.querySelector('.builtin-header')?.textContent).toBe('builtin-header');
  });

  it('renders consumer Template slots with block params and consumer context', () => {
    const { container } = renderPage(
      createPageSchema([
        {
          componentName: 'InfoCard',
          props: { title: 'Current' },
          children: [
            {
              componentName: 'Template',
              props: { slot: 'header', params: ['title'] },
              children: [
                {
                  componentName: 'Text',
                  props: {
                    className: 'slot-header',
                    text: { type: 'JSExpression', value: '`header:${title}`' },
                  },
                },
              ],
            },
            {
              componentName: 'Template',
              props: { slot: 'footer' },
              children: [
                {
                  componentName: 'Text',
                  props: {
                    className: 'slot-footer',
                    text: { type: 'JSExpression', value: '`page:${this.state.pageCount}`' },
                  },
                },
              ],
            },
          ],
        },
      ]),
    );

    // Slot 的 params 来自区块内部作用域（this.props.title）
    expect(container.querySelector('.slot-header')?.textContent).toBe('header:Current');
    // 插槽内容属于使用方，this.state 应解析为页面 state 而不是区块 state
    expect(container.querySelector('.slot-footer')?.textContent).toBe('page:1');
    expect(container.querySelector('.builtin-header')).toBeNull();
  });

  it('dispatches declared output events to onXxx props', () => {
    const { getByTestId } = renderPage(
      createPageSchema([
        {
          componentName: 'InfoCard',
          props: {
            title: 'Current',
            onChange: { type: 'JSFunction', value: 'function(value) { window.__blockChange = value }' },
          },
        },
      ]),
    );

    fireEvent.click(getByTestId('notify'));
    expect((globalThis as Record<string, unknown>).__blockChange).toBe(3);
  });

  it('warns when dispatching an event that is not declared in outputs', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const schema: BlockSchema = {
      componentName: 'WarningBlock',
      outputs: { change: { type: 'number' } },
      children: [
        {
          componentName: 'button',
          props: {
            'data-testid': 'unknown-event',
            onClick: { type: 'JSFunction', value: "function() { this.dispatchEvent('unknown') }" },
          },
          children: 'unknown',
        },
      ],
    };

    const { getByTestId } = render(
      <RendererContextProvider renderSettings={{ materials: { components: {}, blocks: { WarningBlock: schema } } }}>
        <SchemaRenderer schema={createPageSchema([{ componentName: 'WarningBlock' }])} />
      </RendererContextProvider>,
    );

    fireEvent.click(getByTestId('unknown-event'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('does not declare output event "unknown"'));
    warn.mockRestore();
  });

  it('keeps block state across parent re-renders and isolated from page state', () => {
    const pageSchema = createPageSchema([
      {
        componentName: 'InfoCard',
        props: { title: 'Current' },
      },
    ]);
    const { container, getByTestId, rerender } = renderPage(pageSchema);

    fireEvent.click(getByTestId('increase'));
    expect(container.querySelector('.block-state')?.textContent).toBe('visits:4');

    rerender(
      <RendererContextProvider renderSettings={{ materials: { components: {}, blocks: { InfoCard: cardBlock } } }}>
        <SchemaRenderer schema={{ ...pageSchema, state: { pageCount: 2 } }} />
      </RendererContextProvider>,
    );

    expect(container.querySelector('.block-state')?.textContent).toBe('visits:4');
  });

  it('renders blocks in StrictMode without React warnings', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = renderPage(
      createPageSchema([{ componentName: 'InfoCard', props: { title: 'Strict' } }]),
      (tree) => <StrictMode>{tree}</StrictMode>,
    );

    expect(container.querySelector('.block-title')?.textContent).toBe('Strict');
    expect(error).not.toHaveBeenCalled();
    error.mockRestore();
  });

  it('updates block content when consumer props change', () => {
    const { container, rerender } = renderPage(
      createPageSchema([{ componentName: 'InfoCard', props: { title: 'First' } }]),
    );
    expect(container.querySelector('.block-title')?.textContent).toBe('First');

    rerender(
      <RendererContextProvider renderSettings={{ materials: { components: {}, blocks: { InfoCard: cardBlock } } }}>
        <SchemaRenderer schema={createPageSchema([{ componentName: 'InfoCard', props: { title: 'Second' } }])} />
      </RendererContextProvider>,
    );

    expect(container.querySelector('.block-title')?.textContent).toBe('Second');
  });

  it('supports nested blocks', () => {
    const outerBlock: BlockSchema = {
      componentName: 'OuterBlock',
      inputs: { label: { type: 'string' } },
      children: [
        {
          componentName: 'Text',
          props: { text: { type: 'JSExpression', value: '`outer:${this.props.label}`' } },
        },
        {
          componentName: 'InfoCard',
          props: { title: { type: 'JSExpression', value: '`inner:${this.props.label}`' } },
        },
      ],
    };

    const { container } = render(
      <RendererContextProvider
        renderSettings={{ materials: { components: {}, blocks: { InfoCard: cardBlock, OuterBlock: outerBlock } } }}
      >
        <SchemaRenderer schema={createPageSchema([{ componentName: 'OuterBlock', props: { label: 'x' } }])} />
      </RendererContextProvider>,
    );

    expect(container.textContent).toContain('outer:x');
    expect(container.textContent).toContain('inner:x');
  });

  it('supports rendering a block component manually inside a renderer', () => {
    const ManualBlock = defineBlock('ManualBlock', cardBlock);

    function ManualHost() {
      return (
        <ManualBlock
          title="Manual"
          onChange={() => {}}
          slots={{
            header: (scope) => <em className="manual-header">{`manual:${scope?.title}`}</em>,
          }}
        />
      );
    }

    const { container } = render(
      <RendererContextProvider renderSettings={{ materials: { components: { ManualHost } } }}>
        <SchemaRenderer schema={createPageSchema([{ componentName: 'ManualHost' }])} />
      </RendererContextProvider>,
    );

    expect(container.querySelector('.block-title')?.textContent).toBe('Manual');
    expect(container.querySelector('.manual-header')?.textContent).toBe('manual:Manual');
  });

  it('supports array-style inputs/outputs declarations', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const arrayIOBlock: BlockSchema = {
      componentName: 'ArrayIOBlock',
      inputs: [{ name: 'title', type: 'string' }],
      outputs: [{ name: 'change', type: 'number' }],
      children: [
        {
          componentName: 'button',
          props: {
            'data-testid': 'array-io',
            onClick: { type: 'JSFunction', value: "function() { this.dispatchEvent('change', 7) }" },
          },
          children: 'change',
        },
      ],
    };

    const { getByTestId } = render(
      <RendererContextProvider
        renderSettings={{ materials: { components: {}, blocks: { ArrayIOBlock: arrayIOBlock } } }}
      >
        <SchemaRenderer
          schema={createPageSchema([
            {
              componentName: 'ArrayIOBlock',
              props: {
                title: 'array',
                onChange: { type: 'JSFunction', value: 'function(value) { window.__blockChange = value }' },
              },
            },
          ])}
        />
      </RendererContextProvider>,
    );

    fireEvent.click(getByTestId('array-io'));
    expect((globalThis as Record<string, unknown>).__blockChange).toBe(7);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('shares css scope and style element between same-name blocks', async () => {
    const styledBlock: BlockSchema = {
      componentName: 'StyledCard',
      css: '.styled-card { color: red; }',
      children: [{ componentName: 'Text', props: { className: 'styled-card', text: 'styled' } }],
    };

    const { container } = render(
      <RendererContextProvider renderSettings={{ materials: { components: {}, blocks: { StyledCard: styledBlock } } }}>
        <SchemaRenderer schema={createPageSchema([{ componentName: 'StyledCard' }, { componentName: 'StyledCard' }])} />
      </RendererContextProvider>,
    );

    const blockScopes = new Set<string>();
    container.querySelectorAll('*').forEach((element) => {
      Array.from(element.attributes).forEach((attr) => {
        if (attr.name.endsWith('-block-styledcard')) blockScopes.add(attr.name);
      });
    });

    // 两个同名区块复用同一个 scope，只插一个 style
    expect(blockScopes.size).toBe(1);
    await waitFor(() => {
      expect(
        Array.from(document.querySelectorAll('style')).filter((style) => style.id.endsWith('-block-styledcard')),
      ).toHaveLength(1);
    });
  });

  it('supports lowercase slot component name', () => {
    const lowerSlotBlock: BlockSchema = {
      componentName: 'LowerSlotBlock',
      children: [{ componentName: 'slot', props: { name: 'footer' } }],
    };

    const { container } = render(
      <RendererContextProvider
        renderSettings={{ materials: { components: {}, blocks: { LowerSlotBlock: lowerSlotBlock } } }}
      >
        <SchemaRenderer
          schema={createPageSchema([
            {
              componentName: 'LowerSlotBlock',
              children: [
                {
                  componentName: 'Template',
                  props: { slot: 'footer' },
                  children: [{ componentName: 'Text', props: { text: 'lower-slot' } }],
                },
              ],
            },
          ])}
        />
      </RendererContextProvider>,
    );

    expect(container.textContent).toContain('lower-slot');
  });

  it('exposes block helpers aligned with the Vue renderer', () => {
    expect(getSchemaIOKeys({ title: { type: 'string' } })).toEqual(['title']);
    expect(getSchemaIOKeys([{ name: 'title' }, { type: 'string' }])).toEqual(['title']);
    expect(getSchemaIOKeys(null)).toEqual([]);
    expect(getBlock('Missing', { InfoCard: cardBlock })).toBeNull();
    expect(getBlock('InfoCard', { InfoCard: cardBlock })).toBe(loadBlock('InfoCard', { InfoCard: cardBlock }));
  });

  it('renders a block without a renderer ancestor', () => {
    const PlainBlock = defineBlock('PlainBlock', {
      componentName: 'PlainBlock',
      children: [
        { componentName: 'Text', props: { text: { type: 'JSExpression', value: '`hi ${this.props.name}`' } } },
      ],
    });

    const { container } = render(<PlainBlock name="standalone" />);
    expect(container.textContent).toBe('hi standalone');
  });
});
