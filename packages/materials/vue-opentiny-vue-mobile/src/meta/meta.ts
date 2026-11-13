import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json' with { type: 'json' };
import { examples } from './example-schema';
import { mobileWhiteList } from './white-list';

export const mobileMaterialsMeta: IMaterialsMeta = {
  materials: [bundleJson] as unknown as IMaterialsProtocol[],
  wrapperComponent: 'TinyCard',
  whiteList: mobileWhiteList,
  examples,
  rules: ['页面渲染在对话卡片里，不要假设视口高度：根节点不要设置 min-height: 100vh 或 height: 100vh'],
};
