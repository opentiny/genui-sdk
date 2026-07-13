import type { IMaterialsMeta, IExample, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json' with { type: 'json' };
import builtinJson from './materials/builtin.json' with { type: 'json' };
import chartJson from './materials/chart.json' with { type: 'json' };
import extendJson from './materials/extend.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { miniWhiteList, standardWhiteList } from './white-list';

export type { IMaterialsMeta, IExample } from '@opentiny/genui-sdk-core';

// TODO: 优化物料协议后，删除 as IMaterialsProtocol[]
const baseMetaMaterials = [bundleJson, builtinJson, extendJson] as IMaterialsProtocol[];

const standardMetaMaterials = [chartJson, ...baseMetaMaterials] as IMaterialsProtocol[];

const STANDARD_RULES = [
  '禁止设置饼图的 `settings.radius`',
];

function filterExamples(ids: string[]) {
  return allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));
}

export const materialsMeta = {
  materials: standardMetaMaterials,
  wrapperComponent: 'TinyCard',
  whiteList: standardWhiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs']),
  rules: STANDARD_RULES,
};

export const miniMaterialsMeta = {
  materials: baseMetaMaterials,
  wrapperComponent: 'TinyCard',
  whiteList: miniWhiteList,
  examples: filterExamples(['form', 'grid']),
  rules: [],
};
