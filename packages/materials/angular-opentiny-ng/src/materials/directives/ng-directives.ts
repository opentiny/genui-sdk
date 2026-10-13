import { Type } from '@angular/core';
import { TiTipDirective } from '@opentiny/ng';
import type { AutoApplyDirectivePattern } from '../materials';

export const directives: Record<string, Type<any>> = {
  TiTip: TiTipDirective,
};

export const autoApplyDirectives: AutoApplyDirectivePattern = {};
