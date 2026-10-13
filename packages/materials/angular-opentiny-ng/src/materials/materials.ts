import type { Type } from '@angular/core';
import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta';
import { autoApplyDirectives, directives } from './directives';
import { components, modules } from './components';

export type AutoApplyDirectivePattern = Record<
  string,
  (schema: any, context?: Record<PropertyKey, any>) => boolean
>;

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
};
