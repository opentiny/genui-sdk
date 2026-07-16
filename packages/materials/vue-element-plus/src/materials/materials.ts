import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta';
import { components } from './components';

const standardRequiredCompleteFieldSelectors = ['[componentName=ElCard] > props > shadow'];

export const materials: IMaterials = {
  components,
  requiredCompleteFieldSelectors: standardRequiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
};
