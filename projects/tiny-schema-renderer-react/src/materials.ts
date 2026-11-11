import type { ComponentType } from 'react';
import { builtinMaterials } from './builtin/builtin-materials';
import { isHtmlTag } from './builtin/html-tags';
import type { DefaultPropsMap } from './engine/apply-default-props';

export type MaterialComponent = ComponentType<any>;

export type ComponentRegistry = Record<string, MaterialComponent>;

export const MATERIALS = Symbol('MATERIALS');

export type InstanceMaterials = {
  components?: ComponentRegistry;
  defaultPropsMap?: DefaultPropsMap;
  /** 页面可用的工具函数注册表，运行时注入渲染上下文，通过 this.utils.xxx 调用 */
  utils?: Record<string, unknown>;
};

export function getMaterials(context?: object | null): InstanceMaterials {
  return (context as { [MATERIALS]?: InstanceMaterials } | null | undefined)?.[MATERIALS] ?? {};
}

export function getComponent(name: string, context?: object | null): MaterialComponent | string | null {
  return builtinMaterials[name] || getMaterials(context).components?.[name] || (isHtmlTag(name) ? name : null);
}
