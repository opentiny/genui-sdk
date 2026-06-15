import type { ComponentType, ReactNode } from 'react';
import { getCustomSettings, setCustomSettings } from './engine/use-custom-setting';
import { builtinMaterials } from './builtin/builtin-materials';

export type MaterialComponent = ComponentType<any>;

export type ComponentRegistry = Record<string, MaterialComponent>;

/** @deprecated 使用 MaterialComponent */
export type ComponentRenderer<P = Record<string, unknown>> = MaterialComponent;

/** @deprecated 渲染器已直接透传 props，不再使用此结构 */
export interface ComponentRenderProps<P = Record<string, unknown>> {
  props: P;
  children?: ReactNode;
}

/**
 * 获取当前全局注入的物料组件表。
 */
export function getMaterials(): ComponentRegistry {
  return getCustomSettings().materials ?? {};
}

/**
 * 注入或合并物料组件表；也可通过 RendererContextProvider 的 render-settings={{ materials }} 注入。
 *
 * @param materials - 物料名到组件的映射
 */
export function setMaterials(materials: ComponentRegistry) {
  if (!materials || typeof materials !== 'object') return;
  setCustomSettings({
    ...getCustomSettings(),
    materials: { ...getMaterials(), ...materials },
  });
}

/**
 * 合并多份物料组件表，后者覆盖前者同名项。
 *
 * @param materialSets - 待合并的物料表，按顺序叠加
 * @returns 合并后的物料表
 */
export function mergeMaterials(...materialSets: ComponentRegistry[]): ComponentRegistry {
  return Object.assign({}, ...materialSets);
}

/**
 * 获取内置物料与全局注入物料合并后的完整物料表，供节点渲染解析 componentName。
 *
 * @returns 合并后的物料表
 */
export function getResolvedMaterials(): ComponentRegistry {
  return mergeMaterials(builtinMaterials, getMaterials());
}
