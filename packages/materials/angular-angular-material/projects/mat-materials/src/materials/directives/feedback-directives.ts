import { Type } from '@angular/core';
import { MatMenuTrigger } from '@angular/material/menu';
import type { AutoApplyDirectivePattern } from '../types';

/** max：菜单触发器 */
export const feedbackDirectives: Record<string, Type<any>> = {
  matMenuTriggerFor: MatMenuTrigger,
};

export const feedbackAutoApplyDirectives: AutoApplyDirectivePattern = {
  matMenuTriggerFor: (schema: any) =>
    schema?.props?.matMenuTriggerFor !== undefined && schema?.props?.matMenuTriggerFor !== false,
};
