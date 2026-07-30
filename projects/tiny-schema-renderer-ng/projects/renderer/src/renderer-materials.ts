import { type Type } from '@angular/core';

export type DefaultPropsMap = Record<string, Record<string, any>>;

export type AutoApplyDirectivePattern = Record<
  string,
  (schema: any, ctx?: Record<PropertyKey, any>) => boolean
>;

export interface IRendererMaterials {
  components?: Record<string, Type<any>>;
  modules?: Record<string, Type<any>>;
  directives?: Record<string, Type<any>>;
  autoApplyDirectives?: AutoApplyDirectivePattern;
  defaultPropsMap?: DefaultPropsMap;
}

export const MATERIALS_CONTEXT_KEY = Symbol('renderer-materials');
