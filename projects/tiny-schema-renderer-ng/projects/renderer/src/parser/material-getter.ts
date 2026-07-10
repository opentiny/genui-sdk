import { type Type } from '@angular/core';
import type { IRendererMaterials, AutoApplyDirectivePattern } from '../renderer-materials';
import { isHTMLTag } from './parser-utils';
import { RendererTextComponent } from '../buildin/renderer-text.component';
import { RendererImageComponent } from '../buildin/renderer-image.component';
import { LogDirective } from '../buildin/log.directive';
import { nativeElementComponentFactory } from '../native-element.component';

const BUILTIN_COMPONENTS: Record<string, Type<any>> = {
  Text: RendererTextComponent,
  Img: RendererImageComponent,
};

const BUILTIN_DIRECTIVES: Record<string, Type<any>> = {
  log: LogDirective,
};

export const iconMap: Record<string, any> = {};

/**
 * 根据组件名解析可渲染的 Angular 组件类型。
 *
 * @param name - schema 中的组件名
 * @param materials - 应用层传入的物料
 * @param dynamicComponents - 运行时 HTML 标签组件缓存
 */
export const getComponent = (
  name: string,
  materials: IRendererMaterials,
  dynamicComponents: Record<string, Type<any>>,
): Type<any> | null => {
  return (
    BUILTIN_COMPONENTS[name] ||
    materials.components?.[name] ||
    dynamicComponents[name] ||
    (isHTMLTag(name, true) ? createDynamicComponent(name, dynamicComponents) : null)
  );
};

/**
 * 根据组件名获取关联的 NgModule 类型。
 *
 * @param name - schema 中的组件名
 * @param materials - 应用层传入的物料
 */
export const getModuleRef = (
  name: string,
  materials: IRendererMaterials,
): Type<any> | undefined => {
  return materials.modules?.[name];
};

/**
 * 根据指令名获取指令类型。
 *
 * @param name - schema 中的指令名
 * @param materials - 应用层传入的物料
 */
export const getDirective = (
  name: string,
  materials: IRendererMaterials,
): Type<any> | undefined => {
  return BUILTIN_DIRECTIVES[name] || materials.directives?.[name];
};

/**
 * 判断指令是否已在物料中定义。
 *
 * @param name - 指令名
 * @param materials - 应用层传入的物料
 */
export const hasDirective = (name: string, materials: IRendererMaterials): boolean => {
  return !!getDirective(name, materials);
};

/**
 * 获取指令自动应用规则。
 *
 * @param materials - 应用层传入的物料
 */
export const getAutoApplyPatterns = (materials: IRendererMaterials): AutoApplyDirectivePattern => {
  return materials.autoApplyDirectives ?? {};
};

const createDynamicComponent = (
  component: string,
  dynamicComponents: Record<string, Type<any>>,
): Type<any> => {
  const componentFactory = nativeElementComponentFactory(component);
  dynamicComponents[component] = componentFactory;
  return componentFactory;
};
