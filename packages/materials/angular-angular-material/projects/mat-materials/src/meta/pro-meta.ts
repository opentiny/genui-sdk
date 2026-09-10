import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json';
import plusLayoutJson from './materials/plus-layout.json';
import maxFeedbackJson from './materials/max-feedback.json';
import proDataJson from './materials/pro-data.json';
import { examples as allExamples } from './example-schema';
import { proWhiteList } from './white-list';

function filterExamples(ids: string[]) {
  return allExamples.filter((example) => !!example.id && ids.includes(example.id));
}

const metaMaterials = [
  bundleJson,
  plusLayoutJson,
  maxFeedbackJson,
  proDataJson,
] as unknown as IMaterialsProtocol[];

/** pro 物料元数据：全量 */
export const proMaterialsMeta: IMaterialsMeta = {
  materials: metaMaterials,
  wrapperComponent: 'MatCard',
  whiteList: proWhiteList,
  examples: filterExamples(['form', 'info', 'grid', 'tabs', 'pagination']),
  rules: [],
};
