import type { IMaterialsMeta, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json';
import plusLayoutJson from './materials/plus-layout.json';
import { examples as allExamples } from './example-schema';
import { plusWhiteList } from './white-list';

function filterExamples(ids: string[]) {
  return allExamples.filter((example) => !!example.id && ids.includes(example.id));
}

const metaMaterials = [bundleJson, plusLayoutJson] as unknown as IMaterialsProtocol[];

/** plus 物料元数据：base + 布局 / 导航 */
export const plusMaterialsMeta: IMaterialsMeta = {
  materials: metaMaterials,
  wrapperComponent: 'MatCard',
  whiteList: plusWhiteList,
  examples: filterExamples(['form', 'info', 'tabs']),
  rules: [],
};
