import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta';
import { components } from './components';
import { materialsI18n } from './i18n';

const standardRequiredCompleteFieldSelectors = ['[componentName=ElCard] > props > shadow'];

export const materials: IMaterials = {
  components,
  requiredCompleteFieldSelectors: standardRequiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
  i18n: materialsI18n,
};
