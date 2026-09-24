import type { IMaterials, MergedMaterials } from './materials';
import type { MaterialsRuntimeFactory } from './materials-runtime';

const handleKeys = ['components', 'requiredCompleteFieldSelectors', 'defaultPropsMap', 'runtimeFactory'];

export function mergeMaterials(...sources: (IMaterials | MergedMaterials | undefined)[]): MergedMaterials {
  const components: Record<string, unknown> = {};
  const requiredCompleteFieldSelectors: string[] = [];
  const defaultPropsMap: Record<string, any> = {};
  const runtimeFactories = new Set<MaterialsRuntimeFactory>();
  const extra: Record<string, unknown> = {};

  for (const src of sources) {
    if (!src) {
      continue;
    }
    Object.assign(components, src.components ?? {});
    for (const selector of src.requiredCompleteFieldSelectors ?? []) {
      if (!requiredCompleteFieldSelectors.includes(selector)) {
        requiredCompleteFieldSelectors.push(selector);
      }
    }
    Object.assign(defaultPropsMap, src.defaultPropsMap ?? {});
    if (src.runtimeFactory) {
      const factories = Array.isArray(src.runtimeFactory) ? src.runtimeFactory : [src.runtimeFactory];
      for (const factory of factories) {
        if (factory) {
          runtimeFactories.add(factory);
        }
      }
    }
    for (const key of Object.keys(src)) {
      if (!handleKeys.includes(key)) {
        extra[key] = (src as Record<string, unknown>)[key];
      }
    }
  }

  const merged: MergedMaterials = {
    components,
    requiredCompleteFieldSelectors,
    defaultPropsMap,
    ...extra,
  };

  if (runtimeFactories.size > 0) {
    merged.runtimeFactory = [...runtimeFactories];
  }

  return merged;
}
