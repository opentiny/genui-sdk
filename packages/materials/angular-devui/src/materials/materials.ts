import type { Type } from '@angular/core';
import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta';
import { components, modules } from './components';
import {
  autoApplyDirectives,
  directives,
  type AutoApplyDirectivePattern,
} from './directives';

export type { AutoApplyDirectivePattern };

export interface INgMaterials extends IMaterials {
  modules?: Record<string, Type<any>>;
  directives?: Record<string, Type<any>>;
  autoApplyDirectives?: AutoApplyDirectivePattern;
}

export const materials: INgMaterials = {
  components,
  modules,
  directives,
  autoApplyDirectives,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
  requiredCompleteFieldSelectors: [
    '[componentName^=DLineChart] > props > options',
    '[componentName^=DBarChart] > props > options',
    '[componentName^=DPieChart] > props > options',
  ],
};
