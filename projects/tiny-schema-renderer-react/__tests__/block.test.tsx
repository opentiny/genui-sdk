import { StrictMode, type ReactNode } from 'react';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  defineBlock,
  getBlock,
  getBlockEventNames,
  getBlockPropertyNames,
  getBlockSlotNames,
  loadBlock,
  type BlockSchema,
} from '../src/block';
import type { RootNode } from '../src/types';
import { SchemaRenderer } from '../src/RenderMain';
import { RendererContextProvider } from '../src/RendererContextProvider';

const cardBlock: BlockSchema = {
  componentName: 'InfoCard',
  state: { visits: 3 },
  schema: {
    properties: [{ content: [{ property: 'title', type: 'string' }] }],
    events: { onChange: { type: 'event', functionInfo: { params: [{ name: 'value', type: 'number' }] } } },
    slots: {
      header: { params: [{ name: 'title', type: 'string' }] },
      footer: {},
    },
  },
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
    { componentName: 'Slot' },
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
        onClick: { type: 'JSFunction', value: "function() { this.props.onChange(this.state.visits) }" },
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

  it('renders consumer JSSlot slots with block params and consumer context', () => {
    const { container } = renderPage(
      createPageSchema([
        {
          componentName: 'InfoCard',
          props: {
            title: 'Current',
            header: {
              type: 'JSSlot',
              params: ['title'],
              value: [
                {
                  componentName: 'Text',
                  props: {
                    className: 'slot-header',
                    text: { type: 'JSExpression', value: '`header:${title}`' },
                  },
                },
              ],
            },
            footer: {
              type: 'JSSlot',
              value: [
                {
                  componentName: 'Text',
                  props: {
                    className: 'slot-footer',
                    text: { type: 'JSExpression', value: '`page:${this.state.pageCount}`' },
                  },
                },
              ],
            },
          },
        },
      ]),
    );

    // Slot 的 params 来自区块内部作用域（this.props.title）
    expect(container.querySelector('.slot-header')?.textContent).toBe('header:Current');
    // 插槽内容属于使用方，this.state 应解析为页面 state 而不是区块 state
    expect(container.querySelector('.slot-footer')?.textContent).toBe('page:1');
    expect(container.querySelector('.builtin-header')).toBeNull();
  });

  it('fills the default slot with consumer children', () => {
    const { container } = renderPage(
      createPageSchema([
        {
          componentName: 'InfoCard',
          props: {
            title: 'Current',
            header: {
              type: 'JSSlot',
              value: [
                {
                  componentName: 'Text',
                  props: {
                    className: 'slot-header',
                    text: { type: 'JSExpression', value: '`header:${this.state.pageCount}`' },
                  },
                },
              ],
            },
            footer: {
              type: 'JSSlot',
              value: [
                {
                  componentName: 'Text',
                  props: {
                    className: 'slot-footer',
                    text: { type: 'JSExpression', value: '`page:${this.state.pageCount}`' },
                  },
                },
              ],
            },
          },
          children: [
            {
              componentName: 'Text',
              props: {
                className: 'slot-default',
                text: { type: 'JSExpression', value: '`default:${this.state.pageCount}`' },
              },
            },
          ],
        },
      ]),
    );

    // children 进入默认插槽，表达式在使用方上下文求值
    expect(container.querySelector('.slot-default')?.textContent).toBe('default:1');
    // header/footer 插槽由 JSSlot 属性提供，兜底内容不渲染
    expect(container.querySelector('.slot-header')?.textContent).toBe('header:1');
    expect(container.querySelector('.builtin-header')).toBeNull();
  });

  it('accepts a single node object as JSSlot value', () => {
    const { container } = renderPage(
      createPageSchema([
        {
          componentName: 'InfoCard',
          props: {
            header: {
              type: 'JSSlot',
              // 单节点对象：解析时包一层数组，与数组值行为一致
              value: { componentName: 'Text', props: { className: 'single-node', text: 'single' } },
            },
          },
        },
      ]),
    );

    expect(container.querySelector('.single-node')?.textContent).toBe('single');
    expect(container.querySelector('.builtin-header')).toBeNull();
  });

  it('invokes consumer event props directly like React handlers', () => {
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
      schema: { properties: [{ content: [{ property: 'label', type: 'string' }] }] },
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

  it('resolves nested block slot outlets to the nearest block context', () => {
    // 内层区块：具名插槽 body，若插槽通道解析错层会渲染出兜底内容
    const innerBlock: BlockSchema = {
      componentName: 'InnerBlock',
      schema: { slots: { body: {} } },
      children: [
        {
          componentName: 'Slot',
          props: { name: 'body' },
          children: [{ componentName: 'Text', props: { className: 'inner-fallback', text: 'inner-fallback' } }],
        },
      ],
    };

    // 外层区块：插槽 content 的内容由页面提供，内容里嵌了内层区块
    const outerBlock: BlockSchema = {
      componentName: 'OuterBlock',
      schema: { slots: { content: {} } },
      children: [
        {
          componentName: 'Slot',
          props: { name: 'content' },
          children: [{ componentName: 'Text', props: { className: 'outer-fallback', text: 'outer-fallback' } }],
        },
      ],
    };

    const { container } = render(
      <RendererContextProvider
        renderSettings={{ materials: { components: {}, blocks: { InnerBlock: innerBlock, OuterBlock: outerBlock } } }}
      >
        <SchemaRenderer
          schema={createPageSchema([
            {
              componentName: 'OuterBlock',
              props: {
                content: {
                  type: 'JSSlot',
                  value: [
                    {
                      componentName: 'InnerBlock',
                      // 内层区块自己的插槽：渲染时必须解析到 InnerBlock 的插槽通道而非 OuterBlock 的
                      props: {
                        body: {
                          type: 'JSSlot',
                          value: [
                            { componentName: 'Text', props: { className: 'inner-body', text: 'inner-body-from-page' } },
                          ],
                        },
                      },
                    },
                  ],
                },
              },
            },
          ])}
        />
      </RendererContextProvider>,
    );

    // 外层插槽正常装填，兜底不渲染
    expect(container.querySelector('.outer-fallback')).toBeNull();
    // 内层插槽解析到 InnerBlock 自己的 context：页面提供的内容渲染、兜底不渲染
    expect(container.querySelector('.inner-body')?.textContent).toBe('inner-body-from-page');
    expect(container.querySelector('.inner-fallback')).toBeNull();
  });

  it('supports rendering a block component manually inside a renderer', () => {
    const ManualBlock = defineBlock('ManualBlock', cardBlock);

    function ManualHost() {
      return (
        <ManualBlock
          title="Manual"
          onChange={() => {}}
          header={(scope) => <em className="manual-header">{`manual:${scope?.title}`}</em>}
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

  it('renders a lowercase slot component name', () => {
    const lowerSlotBlock: BlockSchema = {
      componentName: 'LowerSlotBlock',
      schema: { slots: { footer: {} } },
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
              props: {
                footer: {
                  type: 'JSSlot',
                  value: [{ componentName: 'Text', props: { text: 'lower-slot' } }],
                },
              },
            },
          ])}
        />
      </RendererContextProvider>,
    );

    expect(container.textContent).toContain('lower-slot');
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

  it('exposes block helpers aligned with the bundle-style declarations', () => {
    expect(getBlockPropertyNames(cardBlock)).toEqual(['title']);
    expect(getBlockEventNames(cardBlock)).toEqual(['onChange']);
    expect(getBlockSlotNames(cardBlock)).toEqual(['header', 'footer']);
    expect(getBlock('Missing', { InfoCard: cardBlock })).toBeNull();
    expect(getBlock('InfoCard', { InfoCard: cardBlock })).toBe(loadBlock('InfoCard', { InfoCard: cardBlock }));
  });

  it('renders a block without a renderer ancestor', () => {
    const PlainBlock = defineBlock('PlainBlock', {
      componentName: 'PlainBlock',
      schema: { properties: [{ content: [{ property: 'name', type: 'string' }] }] },
      children: [
        { componentName: 'Text', props: { text: { type: 'JSExpression', value: '`hi ${this.props.name}`' } } },
      ],
    });

    const { container } = render(<PlainBlock name="standalone" />);
    expect(container.textContent).toBe('hi standalone');
  });

  it('filters block inputs to the declared contract, like the Vue block props', () => {
    const strictBlock: BlockSchema = {
      componentName: 'StrictBlock',
      schema: {
        properties: [{ content: [{ property: 'text', type: 'string' }] }],
        events: { onPing: { type: 'event', functionInfo: { params: [] } } },
        slots: { header: {} },
      },
      children: [
        {
          componentName: 'Text',
          props: {
            className: 'strict-props',
            text: { type: 'JSExpression', value: 'Object.keys(this.props).sort().join(",")' },
          },
        },
        { componentName: 'Slot', props: { name: 'header' } },
      ],
    };

    const { container } = render(
      <RendererContextProvider
        renderSettings={{ materials: { components: {}, blocks: { StrictBlock: strictBlock } } }}
      >
        <SchemaRenderer
          schema={createPageSchema([
            {
              componentName: 'StrictBlock',
              props: {
                text: 'declared',
                rogue: 'undeclared',
                'data-tag': 'will-not-pass',
                onPing: { type: 'JSFunction', value: 'function() {}' },
                header: {
                  type: 'JSSlot',
                  value: [{ componentName: 'Text', props: { className: 'strict-header', text: 'header' } }],
                },
              },
            },
          ])}
        />
      </RendererContextProvider>,
    );

    // 只有声明过的属性（text、onPing、header）进入 this.props；
    // 未声明的属性与渲染器注入的 data-* 标记被过滤，与 Vue defineComponent(props) 一致
    expect(container.querySelector('.strict-props')?.textContent).toBe('header,onPing,text');
    expect(container.querySelector('.strict-header')).toBeTruthy();
  });
});
