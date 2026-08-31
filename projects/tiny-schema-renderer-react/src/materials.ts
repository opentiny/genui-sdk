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

export function getMaterials(): ComponentRegistry {
  return getCustomSettings().materials ?? {};
}

export function setMaterials(materials: ComponentRegistry) {
  if (!materials || typeof materials !== 'object') return;
  setCustomSettings({
    ...getCustomSettings(),
    materials: { ...getMaterials(), ...materials },
  });
}

export function mergeMaterials(...materialSets: ComponentRegistry[]): ComponentRegistry {
  return Object.assign({}, ...materialSets);
}

export function getResolvedMaterials(): ComponentRegistry {
  return mergeMaterials(builtinMaterials, getMaterials());
}
