import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta';
import { components } from './components';

export const materials: IMaterials = {
  components,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
};
