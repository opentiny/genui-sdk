import { describe, expect, it } from 'vitest';
import { getTemplateSlotName, groupSlotChildren, isTemplateNode } from '../src/block/slot-group';
import type { Node } from '../src/types';

const text = (value: string): Node => ({ componentName: 'Text', props: { text: value } });

describe('groupSlotChildren', () => {
  it('groups Template children by slot name and merges plain children into default', () => {
    const children: Node[] = [
      { componentName: 'Template', props: { slot: 'header' }, children: [text('h1')] },
      { componentName: 'Template', slot: 'footer', children: [text('f1')] },
      { componentName: 'Template', props: { slot: { name: 'header' } }, children: [text('h2')] },
      text('plain'),
    ];

    const { groups, plainChildren } = groupSlotChildren(children);

    expect(Object.keys(groups)).toEqual(['header', 'footer', 'default']);
    expect(groups.header).toHaveLength(2);
    expect(groups.footer).toHaveLength(1);
    expect(groups.default).toHaveLength(1);
    expect(plainChildren).toHaveLength(1);
  });

  it('skips empty Template children so Slot can render its fallback', () => {
    const { groups } = groupSlotChildren([{ componentName: 'Template', props: { slot: 'header' } } as Node]);

    expect(groups).toEqual({});
  });

  it('returns empty groups when children is not an array', () => {
    expect(groupSlotChildren(undefined)).toEqual({ groups: {}, plainChildren: [] });
    expect(groupSlotChildren('text' as unknown as Node['children'])).toEqual({ groups: {}, plainChildren: [] });
  });

  it('detects Template nodes and falls back to the default slot name', () => {
    expect(isTemplateNode({ componentName: 'Template' } as Node)).toBe(true);
    expect(isTemplateNode({ componentName: 'Text' } as Node)).toBe(false);
    expect(isTemplateNode(null)).toBe(false);

    expect(getTemplateSlotName({ componentName: 'Template' } as Node)).toBe('default');
    expect(getTemplateSlotName({ componentName: 'Template', props: { slot: 'header' } } as Node)).toBe('header');
    expect(getTemplateSlotName({ componentName: 'Template', props: { slot: { name: 'footer' } } } as Node)).toBe(
      'footer',
    );
  });
});
