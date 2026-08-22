import { type Type } from '@angular/core';
import {
  MATERIALS_CONTEXT_KEY,
  type AutoApplyDirectivePattern,
  type IRendererMaterials,
} from '../renderer-materials';
import { isHTMLTag } from './parser-utils';
import { RendererTextComponent } from '../buildin/renderer-text.component';
import { CheckboxControlValueAccessor, DefaultValueAccessor, NgModel } from '@angular/forms';
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
  log: LogDirective,
};

/** 非 standalone 指令 -> 其声明导出的 NgModule（用于创建模块提供 DI 依赖） */
export const directiveModuleRef: Record<string, Type<any>> = {};

(NgModel['ɵdir'] as any).standalone = true;
(DefaultValueAccessor['ɵdir'] as any).standalone = true;
(CheckboxControlValueAccessor['ɵdir'] as any).standalone = true;

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
  return {
    ngModel: (schema: any) => !!(schema?.props?.ngModel || schema?.props?.onNgModelChange),
    defaultValueAccessor: (schema: any, ctx = {}) => {
      const componentType = getComponent(schema?.componentName, ctx);
      if (!(componentType as any)?.['ɵcmp']) {
        return false;
      }
      const componentSelectors = (componentType as any)?.['ɵcmp']?.selectors;
      const selectorMatch = () => ['input', 'textarea'].includes(componentSelectors?.[0]?.[0] ?? '');
      const propsMatch = () => schema?.props?.['ngModel'] && schema?.props?.type !== 'checkbox';
      return selectorMatch() && propsMatch();
    },
    checkboxValueAccessor: (schema: any, ctx = {}) => {
      const componentType = getComponent(schema?.componentName, ctx);
      if (!(componentType as any)?.['ɵcmp']) {
        return false;
      }
      const componentSelectors = (componentType as any)?.['ɵcmp']?.selectors;
      const selectorMatch = () => ['input'].includes(componentSelectors?.[0]?.[0] ?? '');
      const propsMatch = () => schema?.props?.['ngModel'] && schema?.props?.type === 'checkbox';
      return selectorMatch() && propsMatch();
    },
    ...(getMaterials(context).autoApplyDirectives ?? {}),
  };
};
