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
};

export function getMaterials(context?: object | null): InstanceMaterials {
  return (context as { [MATERIALS]?: InstanceMaterials } | null | undefined)?.[MATERIALS] ?? {};
}

export function getComponent(name: string, context?: object | null): MaterialComponent | string | null {
  return builtinMaterials[name] || getMaterials(context).components?.[name] || (isHtmlTag(name) ? name : null);
}
