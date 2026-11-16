import { createElement, Fragment } from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SchemaRenderer } from '../src/RenderMain';
import { RendererContextProvider } from '../src/RendererContextProvider';
import { getBlock, type BlockSchema } from '../src/block';
import type { RootNode } from '../src/types';
import { BLOCKS, MATERIALS } from '../src/context-symbols';

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

const blockPage: RootNode = {
  componentName: 'Page',
  children: [{ componentName: 'Card' }],
};

const blockA: BlockSchema = {
  componentName: 'Card',
  children: [{ componentName: 'Text', props: { text: 'block-A' } }],
};

const blockB: BlockSchema = {
  componentName: 'Card',
  children: [{ componentName: 'Text', props: { text: 'block-B' } }],
};

describe('SchemaRenderer materials isolation', () => {
  afterEach(cleanup);

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

  it('does not share block component caches across renderer instances', () => {
    const { container } = render(
      createElement(
        Fragment,
        null,
        createElement(
          RendererContextProvider,
          { renderSettings: { materials: { components: {}, blocks: { Card: blockA } } } },
          createElement(SchemaRenderer, { schema: blockPage }),
        ),
        createElement(
          RendererContextProvider,
          { renderSettings: { materials: { components: {}, blocks: { Card: blockB } } } },
          createElement(SchemaRenderer, { schema: blockPage }),
        ),
      ),
    );

    // 每个渲染器实例按自己的 materials.blocks 定义区块，同名区块不会互相覆盖
    expect(container.textContent).toContain('block-A');
    expect(container.textContent).toContain('block-B');
  });
});

describe('getBlock', () => {
  it('caches block components on the renderer context', () => {
    const createContext = () => ({
      [MATERIALS]: { blocks: { Card: blockA } },
      [BLOCKS]: {},
    });

    const contextA = createContext();
    // 同一份上下文复用同一个组件，避免重复渲染时重建导致区块状态丢失
    expect(getBlock('Card', contextA)).toBe(getBlock('Card', contextA));
    // 不同渲染器上下文各自缓存，互不影响
    expect(getBlock('Card', createContext())).not.toBe(getBlock('Card', contextA));
    expect(getBlock('Missing', contextA)).toBeNull();
    // 上下文没有区块缓存时不做全局兜底
    expect(getBlock('Card', { [MATERIALS]: { blocks: { Card: blockA } } })).toBeNull();
  });

  it('rebuilds the block component when the schema reference changes', () => {
    const materials = { blocks: { Card: blockA } };
    const context = { [MATERIALS]: materials, [BLOCKS]: {} };

    const first = getBlock('Card', context);
    expect(getBlock('Card', context)).toBe(first);

    // 替换 blocks[name] 后按引用重建，避免区块组件闭包钉死旧 schema（与 Vue 版本一致）
    const replacement: BlockSchema = {
      componentName: 'Card',
      children: [{ componentName: 'Text', props: { text: 'block-C' } }],
    };
    materials.blocks.Card = replacement;

    const second = getBlock('Card', context);
    expect(second).not.toBe(first);
    expect(second?.__blockSchema).toBe(replacement);
  });
});
