import type { IMaterials, MergedMaterials } from './materials';
import type { MaterialsThemeFactory } from './materials-theme';

const handleKeys = ['components', 'requiredCompleteFieldSelectors', 'defaultPropsMap', 'themeFactory'];

function isMergeableRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function mergeMaterials(...sources: (IMaterials | undefined)[]): MergedMaterials {
  const components: Record<string, unknown> = {};
  const requiredCompleteFieldSelectors: string[] = [];
  const defaultPropsMap: Record<string, any> = {};
  const themes: MaterialsThemeFactory[] = [];
  const seenThemes = new Set<MaterialsThemeFactory>();
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
    if (src.themeFactory) {
      const factories = Array.isArray(src.themeFactory) ? src.themeFactory : [src.themeFactory];
      for (const factory of factories) {
        if (factory && !seenThemes.has(factory)) {
          seenThemes.add(factory);
          themes.push(factory);
        }
      }
    }
    for (const key of Object.keys(src)) {
      if (handleKeys.includes(key)) {
        continue;
      }
      const next = (src as Record<string, unknown>)[key];
      const prev = extra[key];
      extra[key] =
        isMergeableRecord(prev) && isMergeableRecord(next) ? { ...prev, ...next } : next;
    }
  }

  const merged: MergedMaterials = {
    components,
    requiredCompleteFieldSelectors,
    defaultPropsMap,
    ...extra,
  };

  if (themes.length > 0) {
    merged.themeFactory = themes;
  }

  return merged;
}
