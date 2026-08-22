import { type Type } from '@angular/core';
import {
  MATERIALS_CONTEXT_KEY,
  type AutoApplyDirectivePattern,
  type IRendererMaterials,
} from '../renderer-materials';
import { isHTMLTag } from './parser-utils';
import { RendererTextComponent } from '../buildin/renderer-text.component';
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  EmailValidator,
  FormsModule,
  NgModel,
  NumberValueAccessor,
  NgControlStatus,
  RadioControlValueAccessor,
  RequiredValidator,
  SelectControlValueAccessor,
} from '@angular/forms';
import { LogDirective } from '../buildin/log.directive';
import { nativeElementComponentFactory } from '../native-element.component';

export const Mapper: Record<string, Type<any>> = {
  Text: RendererTextComponent,
};

export const ModuleRef: Record<string, Type<any>> = {};

export const directiveMap: Record<string, Type<any>> = {
  ngModel: NgModel,
  defaultValueAccessor: DefaultValueAccessor,
  checkboxValueAccessor: CheckboxControlValueAccessor,
  numberValueAccessor: NumberValueAccessor,
  selectValueAccessor: SelectControlValueAccessor,
  radioValueAccessor: RadioControlValueAccessor,
  ngControlStatus: NgControlStatus,
  required: RequiredValidator,
  email: EmailValidator,
  log: LogDirective,
};

/** 非 standalone 指令 -> 其声明导出的 NgModule（用于创建模块提供 DI 依赖） */
export const directiveModuleRef: Record<string, Type<any>> = {
  ngModel: FormsModule,
  defaultValueAccessor: FormsModule,
  checkboxValueAccessor: FormsModule,
  numberValueAccessor: FormsModule,
  selectValueAccessor: FormsModule,
  radioValueAccessor: FormsModule,
  ngControlStatus: FormsModule,
  required: FormsModule,
  email: FormsModule,
};

(NgModel['ɵdir'] as any).standalone = true;
(DefaultValueAccessor['ɵdir'] as any).standalone = true;
(CheckboxControlValueAccessor['ɵdir'] as any).standalone = true;
(NumberValueAccessor['ɵdir'] as any).standalone = true;
(SelectControlValueAccessor['ɵdir'] as any).standalone = true;
(RadioControlValueAccessor['ɵdir'] as any).standalone = true;
(NgControlStatus['ɵdir'] as any).standalone = true;
(RequiredValidator['ɵdir'] as any).standalone = true;
(EmailValidator['ɵdir'] as any).standalone = true;

export const iconMap: Record<string, any> = {};

export const customElements: Record<string, Type<any>> = {};

export const getMaterials = (context: Record<PropertyKey, any> = {}): IRendererMaterials =>
  context[MATERIALS_CONTEXT_KEY] ?? {};

export const getComponent = (
  name: string,
  context: Record<PropertyKey, any> = {},
): Type<any> | null => {
  return (
    Mapper[name] ||
    getMaterials(context).components?.[name] ||
    customElements[name] ||
    (isHTMLTag(name, true) ? createComponent(name) : null)
  );
};

export const getModuleRef = (
  name: string,
  context: Record<PropertyKey, any> = {},
): Type<any> | undefined => {
  return ModuleRef[name] || getMaterials(context).modules?.[name];
};

export const getDirective = (
  name: string,
  context: Record<PropertyKey, any> = {},
): Type<any> | undefined => {
  return directiveMap[name] || getMaterials(context).directives?.[name];
};

export const getDirectiveModuleRef = (
  name: string,
  context: Record<PropertyKey, any> = {},
): Type<any> | undefined => {
  return directiveModuleRef[name] || getMaterials(context).directivesModuleMap?.[name];
};

export const createComponent = (component: string): Type<any> => {
  const componentFactory = nativeElementComponentFactory(component);
  Mapper[component] = componentFactory;
  return componentFactory;
};

export const getAutoApplyPatterns = (
  context: Record<PropertyKey, any> = {},
): AutoApplyDirectivePattern => {
  const tagOf = (schema: any, ctx: Record<PropertyKey, any> = {}) =>
    (getComponent(schema?.componentName, ctx) as any)?.['ɵcmp']?.selectors?.[0]?.[0] ?? '';

  const hasNgModel = (schema: any) => !!schema?.props?.ngModel;

  const hasAttr = (schema: any, key: string) =>
    schema?.props?.[key] !== undefined && schema?.props?.[key] !== false;

  const isInputType = (schema: any, ctx: Record<PropertyKey, any>, type: string) =>
    tagOf(schema, ctx) === 'input' && hasNgModel(schema) && schema?.props?.type === type;

  return {
    ngModel: (schema: any) => !!(schema?.props?.ngModel || schema?.props?.onNgModelChange),
    // 控件状态：随 ngModel 自动挂载，往宿主写 ng-valid/ng-invalid/ng-touched/ng-dirty 等 class，供校验结果展示。
    ngControlStatus: (schema: any) => !!(schema?.props?.ngModel || schema?.props?.onNgModelChange),
    defaultValueAccessor: (schema: any, ctx = {}) =>
      ['input', 'textarea'].includes(tagOf(schema, ctx)) &&
      hasNgModel(schema) &&
      !['checkbox', 'number', 'range', 'radio'].includes(schema?.props?.type),
    checkboxValueAccessor: (schema: any, ctx = {}) => isInputType(schema, ctx, 'checkbox'),
    numberValueAccessor: (schema: any, ctx = {}) => isInputType(schema, ctx, 'number'),
    radioValueAccessor: (schema: any, ctx = {}) => isInputType(schema, ctx, 'radio'),
    selectValueAccessor: (schema: any, ctx = {}) =>
      tagOf(schema, ctx) === 'select' && hasNgModel(schema) && !schema?.props?.multiple,
    // 校验器：仅在挂载 ngModel 时生效（校验器需 @Self() NgControl）。
    required: (schema: any, ctx = {}) => hasNgModel(schema) && hasAttr(schema, 'required'),
    email: (schema: any, ctx = {}) => hasNgModel(schema) && hasAttr(schema, 'email'),
    ...(getMaterials(context).autoApplyDirectives ?? {}),
  };
};
