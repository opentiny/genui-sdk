import type { IMaterialsMeta, IExample, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { whiteList } from './white-list';

const metaMaterials = [bundleJson] as IMaterialsProtocol[];

function filterExamples(ids: string[]) {
  return allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));
}

export const materialsMeta: IMaterialsMeta = {
  materials: metaMaterials,
  wrapperComponent: 'TiCard',
  whiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs', 'pagination', 'refs']),
  rules: [],
};
