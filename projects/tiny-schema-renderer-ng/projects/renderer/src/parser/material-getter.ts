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
  FormControlDirective,
  FormGroupDirective,
  FormsModule,
  NgForm,
  NgModel,
  NumberValueAccessor,
  NgControlStatus,
  RadioControlValueAccessor,
  ReactiveFormsModule,
  RequiredValidator,
  SelectControlValueAccessor,
  SelectMultipleControlValueAccessor,
  NgSelectOption,
  ɵNgSelectMultipleOption,
} from '@angular/forms';
import { LogDirective } from '../buildin/log.directive';
import { NgControlContainerHostBridge } from '../buildin/ng-control-container-host.directive';
import { NgSelectOptionHostBridge } from '../buildin/ng-select-option-host.directive';
import {
  SchemaFormArrayName,
  SchemaFormControlName,
  SchemaFormGroupName,
  SchemaNgModelGroup,
} from '../buildin/skip-self-control-container';
import { nativeElementComponentFactory } from '../native-element.component';
import { getBlock } from '../block';

export const Mapper: Record<string, Type<any>> = {
  Text: RendererTextComponent,
};

export const ModuleRef: Record<string, Type<any>> = {};

export const directiveMap: Record<string, Type<any>> = {
  ngModel: NgModel,
  ngModelGroup: SchemaNgModelGroup,
  ngForm: NgForm,
  formGroup: FormGroupDirective,
  formControl: FormControlDirective,
  formControlName: SchemaFormControlName,
  formGroupName: SchemaFormGroupName,
  formArrayName: SchemaFormArrayName,
  ngControlContainerHost: NgControlContainerHostBridge,
  ngSelectOptionHost: NgSelectOptionHostBridge,
  ngSelectOption: NgSelectOption,
  ngSelectMultipleOption: ɵNgSelectMultipleOption,
  defaultValueAccessor: DefaultValueAccessor,
  checkboxValueAccessor: CheckboxControlValueAccessor,
  numberValueAccessor: NumberValueAccessor,
  selectValueAccessor: SelectControlValueAccessor,
  selectMultipleValueAccessor: SelectMultipleControlValueAccessor,
  radioValueAccessor: RadioControlValueAccessor,
  ngControlStatus: NgControlStatus,
  required: RequiredValidator,
  email: EmailValidator,
  log: LogDirective,
};

/** 非 standalone 指令 -> 其声明导出的 NgModule（用于创建模块提供 DI 依赖） */
export const directiveModuleRef: Record<string, Type<any>> = {
  ngModel: FormsModule,
  ngModelGroup: FormsModule,
  ngForm: FormsModule,
  formGroup: ReactiveFormsModule,
  formControl: ReactiveFormsModule,
  formControlName: ReactiveFormsModule,
  formGroupName: ReactiveFormsModule,
  formArrayName: ReactiveFormsModule,
  defaultValueAccessor: FormsModule,
  checkboxValueAccessor: FormsModule,
  numberValueAccessor: FormsModule,
  selectValueAccessor: FormsModule,
  selectMultipleValueAccessor: FormsModule,
  ngSelectOption: FormsModule,
  ngSelectMultipleOption: FormsModule,
  radioValueAccessor: FormsModule,
  ngControlStatus: FormsModule,
  required: FormsModule,
  email: FormsModule,
};

(NgModel['ɵdir'] as any).standalone = true;
(NgForm['ɵdir'] as any).standalone = true;
(FormGroupDirective['ɵdir'] as any).standalone = true;
(FormControlDirective['ɵdir'] as any).standalone = true;
(DefaultValueAccessor['ɵdir'] as any).standalone = true;
(CheckboxControlValueAccessor['ɵdir'] as any).standalone = true;
(NumberValueAccessor['ɵdir'] as any).standalone = true;
(SelectControlValueAccessor['ɵdir'] as any).standalone = true;
(SelectMultipleControlValueAccessor['ɵdir'] as any).standalone = true;
(NgSelectOption['ɵdir'] as any).standalone = true;
(ɵNgSelectMultipleOption['ɵdir'] as any).standalone = true;
(RadioControlValueAccessor['ɵdir'] as any).standalone = true;
(NgControlStatus['ɵdir'] as any).standalone = true;
(RequiredValidator['ɵdir'] as any).standalone = true;
(EmailValidator['ɵdir'] as any).standalone = true;

export const customElements: Record<string, Type<any>> = {};

export const getMaterials = (context: Record<PropertyKey, any> = {}): IRendererMaterials =>
  context[MATERIALS_CONTEXT_KEY] ?? {};

export const getComponent = (
  name: string,
  context: Record<PropertyKey, any> = {},
): Type<any> | null => {
  return (
    Mapper[name] ||
    getBlock(name, context) ||
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

const NATIVE_FORM_TAGS = new Set(['input', 'textarea', 'select']);

export const getAutoApplyPatterns = (
  context: Record<PropertyKey, any> = {},
): AutoApplyDirectivePattern => {
  const tagOf = (schema: any, ctx: Record<PropertyKey, any> = {}) => {
    const name = String(schema?.componentName ?? '').toLowerCase();
    // Prefer schema name: NativeElement ɵcmp is Object.create'd and selectors can be stale.
    if (NATIVE_FORM_TAGS.has(name)) {
      return name;
    }
    const sel = (getComponent(schema?.componentName, ctx) as any)?.['ɵcmp']?.selectors?.[0]?.[0];
    return typeof sel === 'string' ? sel.toLowerCase() : '';
  };

  const hasNgModel = (schema: any) => !!(schema?.props?.ngModel || schema?.props?.onNgModelChange);

  const hasAttr = (schema: any, key: string) =>
    schema?.props?.[key] !== undefined && schema?.props?.[key] !== false;

  // @Self() NG_VALUE_ACCESSOR / NG_VALIDATORS / NgControl live on this TNode only.
  const hasFormBinding = (schema: any) =>
    hasNgModel(schema) || hasAttr(schema, 'formControlName') || hasAttr(schema, 'formControl');

  const isInputType = (schema: any, ctx: Record<PropertyKey, any>, type: string) =>
    tagOf(schema, ctx) === 'input' && hasFormBinding(schema) && schema?.props?.type === type;

  const isNativeOption = (schema: any) =>
    String(schema?.componentName ?? '').toLowerCase() === 'option';

  return {
    ngForm: (schema: any) =>
      String(schema?.componentName ?? '').toLowerCase() === 'form' &&
      !hasAttr(schema, 'ngNoForm') &&
      !hasAttr(schema, 'ngNativeValidate') &&
      !hasAttr(schema, 'formGroup'),
    ngModel: (schema: any) => hasNgModel(schema),
    ngModelGroup: (schema: any) => hasAttr(schema, 'ngModelGroup'),
    ngControlStatus: (schema: any) => hasFormBinding(schema),
    ngControlContainerHost: (schema: any) => hasNgModel(schema),
    formGroup: (schema: any) => hasAttr(schema, 'formGroup'),
    formControl: (schema: any) => hasAttr(schema, 'formControl'),
    formControlName: (schema: any) => hasAttr(schema, 'formControlName'),
    formGroupName: (schema: any) => hasAttr(schema, 'formGroupName'),
    formArrayName: (schema: any) => hasAttr(schema, 'formArrayName'),
    defaultValueAccessor: (schema: any, ctx = {}) =>
      ['input', 'textarea'].includes(tagOf(schema, ctx)) &&
      hasFormBinding(schema) &&
      !['checkbox', 'number', 'range', 'radio'].includes(schema?.props?.type),
    checkboxValueAccessor: (schema: any, ctx = {}) => isInputType(schema, ctx, 'checkbox'),
    numberValueAccessor: (schema: any, ctx = {}) => isInputType(schema, ctx, 'number'),
    radioValueAccessor: (schema: any, ctx = {}) => isInputType(schema, ctx, 'radio'),
    selectValueAccessor: (schema: any, ctx = {}) =>
      tagOf(schema, ctx) === 'select' && hasFormBinding(schema) && !schema?.props?.multiple,
    selectMultipleValueAccessor: (schema: any, ctx = {}) =>
      tagOf(schema, ctx) === 'select' && hasFormBinding(schema) && !!schema?.props?.multiple,
    ngSelectOption: (schema: any) => isNativeOption(schema),
    ngSelectMultipleOption: (schema: any) => isNativeOption(schema),
    ngSelectOptionHost: (schema: any) => isNativeOption(schema),
    // 校验器：仅在挂载表单控件时生效（校验器需 @Self() NgControl）。
    required: (schema: any) => hasFormBinding(schema) && hasAttr(schema, 'required'),
    email: (schema: any) => hasFormBinding(schema) && hasAttr(schema, 'email'),
    ...(getMaterials(context).autoApplyDirectives ?? {}),
  };
};
