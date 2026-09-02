import { describe, expect, it } from 'vitest';
import type { IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import {
  formatComponentList,
  groupComponentsByCategory,
  parseWhitelistNames,
} from '../component-categories';

const STANDARD_NAMES = [
  'a',
  'h1',
  'TinyIcon',
  'TinyForm',
  'TinyFormItem',
  'TinyInput',
  'TinyButton',
  'TinyGrid',
  'TinyPager',
  'TinyCard',
  'TinyHuichartsLine',
  'TinyHuichartsPie',
  'CustomFoo',
];

describe('component-categories', () => {
  it('parseWhitelistNames / formatComponentList 往返', () => {
    expect(parseWhitelistNames('`A`, `B`')).toEqual(['A', 'B']);
    expect(formatComponentList(['A', 'B'])).toBe('`A`, `B`');
  });

  it('标准白名单分到表单 / 图表 / 数据展示等', () => {
    const groups = groupComponentsByCategory(STANDARD_NAMES);
    const byId = Object.fromEntries(groups.map((group) => [group.id, group.components]));

    expect(byId.basic).toEqual(['a', 'h1', 'TinyIcon']);
    expect(byId.layout).toEqual(['TinyCard']);
    expect(byId.forms).toContain('TinyForm');
    expect(byId.forms).toContain('TinyInput');
    expect(byId['data-display']).toEqual(['TinyGrid', 'TinyPager']);
    expect(byId.charts).toEqual(['TinyHuichartsLine', 'TinyHuichartsPie']);
    expect(byId.other).toEqual(['CustomFoo']);
  });

  it('名称启发式优先于笼统的物料 general 分类', () => {
    const materials = [
      {
        data: {
          framework: 'Vue',
          materials: {
            components: [
              { component: 'TinyForm', category: 'general' },
              { component: 'TinyGrid', category: 'general' },
            ],
          },
        },
      },
    ] as IMaterialsProtocol[];

    const groups = groupComponentsByCategory(['TinyForm', 'TinyGrid'], { materials });
    expect(groups.find((group) => group.id === 'forms')?.components).toEqual(['TinyForm']);
    expect(groups.find((group) => group.id === 'data-display')?.components).toEqual(['TinyGrid']);
  });

  it('无名称启发式时回退物料 category', () => {
    const materials = [
      {
        data: {
          framework: 'Vue',
          materials: {
            components: [{ component: 'MyBox', category: '容器组件' }],
          },
        },
      },
    ] as IMaterialsProtocol[];

    const groups = groupComponentsByCategory(['MyBox'], { materials });
    expect(groups).toEqual([{ id: 'layout', label: '布局组件', components: ['MyBox'] }]);
  });

  it('自定义组件并入白名单，未知名称进其他', () => {
    const groups = groupComponentsByCategory(['TinyCard'], {
      customComponents: [{ component: 'AcmeWidget' }],
    });
    expect(groups.find((group) => group.id === 'layout')?.components).toEqual(['TinyCard']);
    expect(groups.find((group) => group.id === 'other')?.components).toEqual(['AcmeWidget']);
  });
});
