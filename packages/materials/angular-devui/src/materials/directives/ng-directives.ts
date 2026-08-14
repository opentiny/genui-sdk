import type { Type } from '@angular/core';

export type AutoApplyDirectivePattern = Record<
  string,
  (schema: any, context?: Record<PropertyKey, any>) => boolean
>;

export const directives: Record<string, Type<any>> = {};

export const autoApplyDirectives: AutoApplyDirectivePattern = {};
