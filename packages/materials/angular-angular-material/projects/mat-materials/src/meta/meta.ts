import type { IMaterialsMeta, IExample, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json';
import { examples as allExamples } from './example-schema';
import { whiteList } from './white-list';

const metaMaterials = [bundleJson] as unknown as IMaterialsProtocol[];

function filterExamples(ids: string[]) {
  return allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));
}

export const materialsMeta: IMaterialsMeta = {
  materials: metaMaterials,
  wrapperComponent: 'MatCard',
  whiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs', 'pagination']),
  rules: [],
};
