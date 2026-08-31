import type { IMaterials, MergedMaterials } from './materials';
import type { MaterialsThemeFactory } from './materials-theme';

const KNOWN_KEYS = ['components', 'requiredCompleteFieldSelectors', 'defaultPropsMap', 'createTheme'];

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
    if (src.createTheme && !seenThemes.has(src.createTheme)) {
      seenThemes.add(src.createTheme);
      themes.push(src.createTheme);
    }
    for (const key of Object.keys(src)) {
      if (!KNOWN_KEYS.includes(key)) {
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

  if (themes.length > 0) {
    merged.createTheme = themes;
  }

  return merged;
}
