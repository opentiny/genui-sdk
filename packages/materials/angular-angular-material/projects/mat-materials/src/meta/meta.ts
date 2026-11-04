import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json';
import { examples as allExamples } from './example-schema';
import { baseWhiteList } from './white-list';

function filterExamples(ids: string[]) {
  return allExamples.filter((example) => !!example.id && ids.includes(example.id));
}

const metaMaterials = [bundleJson] as unknown as IMaterialsProtocol[];

/** base 物料元数据 */
export const materialsMeta: IMaterialsMeta = {
  materials: metaMaterials,
  wrapperComponent: 'MatCard',
  whiteList: baseWhiteList,
  examples: filterExamples(['form', 'info', 'grid']),
  rules: [],
};
