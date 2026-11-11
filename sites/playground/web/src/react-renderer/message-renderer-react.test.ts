import { describe, expect, it, vi } from 'vitest';
import { getMessageRendererReact } from './message-renderer-react';

vi.mock('@opentiny/genui-sdk-vue', () => ({
  cardIdSymbol: Symbol('cardId'),
  GenuiChat: class {},
}));

describe('getMessageRendererReact', () => {
  it('为 React 卡片显式指定 React 出码，避免回退到 Vue', () => {
    const RendererHeader = () => null;
    const action = { execute: () => undefined };
    const instance = {
      continueChatAction: action,
      saveStateAction: action,
      lastSchemaCardId: 'react-card',
      generating: false,
      getProps: () => ({ rendererSlots: { header: RendererHeader } }),
    } as any;

    const render = getMessageRendererReact(instance);
    const card = render({
      id: 'react-card',
      content: { componentName: 'Page' },
      isJsonComplete: true,
      state: {},
    } as any) as any;

    expect(card.children[0].type).toBe(RendererHeader);
    expect(card.children[0].props.exportFramework).toBe('React');
  });
});
