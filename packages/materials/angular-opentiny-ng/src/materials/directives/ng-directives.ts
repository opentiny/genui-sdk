import { Type } from '@angular/core';
import type { AutoApplyDirectivePattern } from '../materials-types';
import { TiTipDirective } from '@opentiny/ng';
import { CheckboxControlValueAccessor, DefaultValueAccessor, NgModel } from '@angular/forms';

/** 运行时指令表（传给渲染器 `materials.directives`）。 */
export const directives: Record<string, Type<any>> = {
  ngModel: NgModel,
  defaultValueAccessor: DefaultValueAccessor,
  checkboxValueAccessor: CheckboxControlValueAccessor,
  TiTip: TiTipDirective,
};

const INPUT_LIKE_COMPONENTS = new Set(['TiText', 'TiTextArea', 'input', 'textarea']);

/**
 * OpenTiny NG 物料包的指令自动应用规则。
 * 仅当对应指令已注册到 materials.directives 时才会生效。
 */
export const autoApplyDirectives: AutoApplyDirectivePattern = {
  ngModel: (schema: any) => !!(schema?.props?.ngModel || schema?.props?.onNgModelChange),
  defaultValueAccessor: (schema: any) => {
    if (!schema?.props?.ngModel || schema?.props?.type === 'checkbox') {
      return false;
    }
    return INPUT_LIKE_COMPONENTS.has(schema?.componentName);
  },
  checkboxValueAccessor: (schema: any) => {
    return (
      schema?.props?.ngModel &&
      schema?.props?.type === 'checkbox' &&
      INPUT_LIKE_COMPONENTS.has(schema?.componentName)
    );
  },
};
