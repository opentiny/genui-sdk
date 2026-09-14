import type { IMaterialsMeta, IExample, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { whiteList } from './white-list';

export type { IMaterialsMeta, IExample } from '@opentiny/genui-sdk-core';

function filterExamples(ids: string[]) {
  return allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));
}

export const materialsMeta: IMaterialsMeta = {
  materials: [bundleJson] as IMaterialsProtocol[],
  examples: filterExamples(['antd-form', 'list', 'table']),
  whiteList,
  wrapperComponent: 'AntCard',
};
