import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta';
import { components } from './components';

const requiredCompleteFieldSelectors = [
  '[componentName=AntSelect] > props > options > * > label',
  '[componentName=AntTabs] > props > items > * > label',
];

export const materials: IMaterials = {
  components,
  requiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
};
