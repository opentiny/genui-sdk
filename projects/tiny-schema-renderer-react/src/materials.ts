import type { ComponentRegistry } from './types';
import { getRendererSettings, setRendererSettings } from './engine/new-fn';

/**
 * 获取当前全局注入的物料组件表。
 * 对齐 Vue tiny-schema-renderer 的 getCustomSettings().materials。
 */
export function getMaterials(): ComponentRegistry {
  return getRendererSettings().materials ?? {};
}

/**
 * 注入或合并物料组件表，解耦渲染器与具体 UI 库依赖。
 * 对齐 Vue tiny-schema-renderer 的 setCustomSettings({ materials })。
 *
 * @param materials - 物料名到渲染器的映射，如 AntForm、TinyButton 等
 */
export function setMaterials(materials: ComponentRegistry) {
  if (!materials || typeof materials !== 'object') return;
  setRendererSettings({
    materials: { ...getMaterials(), ...materials },
  });
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
