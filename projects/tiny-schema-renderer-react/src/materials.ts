import type { ComponentType } from 'react';
import { getCustomSettings, setCustomSettings } from './engine/use-custom-setting';
import { builtinMaterials } from './builtin/builtin-materials';

export type MaterialComponent = ComponentType<any>;

export type ComponentRegistry = Record<string, MaterialComponent>;

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
