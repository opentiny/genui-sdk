import type { Type } from '@angular/core';
import type { IMaterials } from '@opentiny/genui-sdk-core';

export type AutoApplyDirectivePattern = Record<
  string,
  (schema: any, context?: Record<PropertyKey, any>) => boolean
>;

export interface IMatMaterials extends IMaterials {
  modules?: Record<string, Type<any>>;
  directives?: Record<string, Type<any>>;
  autoApplyDirectives?: AutoApplyDirectivePattern;
}
