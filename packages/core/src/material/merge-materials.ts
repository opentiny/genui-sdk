import type { IMaterials, MergedMaterials } from './materials';
import type { MaterialsThemeFactory } from './materials-theme';

const handleKeys = ['components', 'requiredCompleteFieldSelectors', 'defaultPropsMap', 'themeFactory', 'utils'];

export function mergeMaterials(...sources: (IMaterials | undefined)[]): MergedMaterials {
  const components: Record<string, unknown> = {};
  const requiredCompleteFieldSelectors: string[] = [];
  const defaultPropsMap: Record<string, any> = {};
  const utils: Record<string, unknown> = {};
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
    Object.assign(utils, src.utils ?? {});
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
      if (!handleKeys.includes(key)) {
        extra[key] = (src as Record<string, unknown>)[key];
      }
    }
  }

  const merged: MergedMaterials = {
    components,
    requiredCompleteFieldSelectors,
    defaultPropsMap,
    utils,
    ...extra,
  };

  if (themes.length > 0) {
    merged.themeFactory = themes;
  }

  return merged;
}
