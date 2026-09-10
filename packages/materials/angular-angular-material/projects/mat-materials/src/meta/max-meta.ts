import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json';
import plusLayoutJson from './materials/plus-layout.json';
import maxFeedbackJson from './materials/max-feedback.json';
import { examples as allExamples } from './example-schema';
import { maxWhiteList } from './white-list';

function filterExamples(ids: string[]) {
  return allExamples.filter((example) => !!example.id && ids.includes(example.id));
}

const metaMaterials = [bundleJson, plusLayoutJson, maxFeedbackJson] as unknown as IMaterialsProtocol[];

/** max 物料元数据：plus + 反馈 */
export const maxMaterialsMeta: IMaterialsMeta = {
  materials: metaMaterials,
  wrapperComponent: 'MatCard',
  whiteList: maxWhiteList,
  examples: filterExamples(['form', 'info', 'tabs']),
  rules: [],
};
