import { Type } from '@angular/core';
import { TiTipDirective, TiTipModule } from '@opentiny/ng';
import type { AutoApplyDirectivePattern } from '../materials';

export const directives: Record<string, Type<any>> = {
  TiTip: TiTipDirective,
};

export const directivesModuleMap: Record<string, Type<any>> = {
  TiTip: TiTipModule,
};

export const autoApplyDirectives: AutoApplyDirectivePattern = {};
