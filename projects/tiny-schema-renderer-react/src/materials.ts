import type { ComponentType, ReactNode } from 'react';
import { getCustomSettings, setCustomSettings } from './engine/use-custom-setting';
import { builtinMaterials } from './builtin/builtin-materials';

/** 物料组件，对齐 Vue 物料包 `Record<string, Component>` 的直接映射。 */
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
 * 对齐 Vue tiny-schema-renderer 的 getCustomSettings().materials。
 */
export function getMaterials(): ComponentRegistry {
  return getCustomSettings().materials ?? {};
}

/**
 * 注入或合并物料组件表，解耦渲染器与具体 UI 库依赖。
 * 对齐 Vue tiny-schema-renderer 的 setCustomSettings({ materials })。
 *
 * @param materials - 物料名到渲染器的映射，如 AntForm、TinyButton 等
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

/**
 * 定义一组物料组件，便于物料包统一导出。
 *
 * @param components - 物料组件注册表
 * @returns 包含 materials 字段的对象，可传给 PageContextProvider.settings 或 setMaterials
 */
export function defineMaterials(components: ComponentRegistry): { materials: ComponentRegistry } {
  return { materials: components };
}
