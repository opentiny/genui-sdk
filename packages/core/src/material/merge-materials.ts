import type { IMaterials } from './materials';
import type { IMaterialsTheme } from './materials-theme';

const KNOWN_KEYS = ['components', 'requiredCompleteFieldSelectors', 'defaultPropsMap', 'theme'];

export function mergeMaterials(...sources: (IMaterials | undefined)[]): IMaterials {
  const components: Record<string, unknown> = {};
  const requiredCompleteFieldSelectors: string[] = [];
  const defaultPropsMap: Record<string, any> = {};
  const themes: IMaterialsTheme[] = [];
  const seenThemes = new Set<IMaterialsTheme>();
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
    if (src.theme) {
      const arr = Array.isArray(src.theme) ? src.theme : [src.theme];
      for (const theme of arr) {
        if (theme && !seenThemes.has(theme)) {
          seenThemes.add(theme);
          themes.push(theme);
        }
      }
    }
    for (const key of Object.keys(src)) {
      if (!KNOWN_KEYS.includes(key)) {
        extra[key] = (src as Record<string, unknown>)[key];
      }
    }
  }

  const merged: IMaterials = {
    components,
    requiredCompleteFieldSelectors,
    defaultPropsMap,
    ...extra,
  };

  if (themes.length === 1) {
    merged.theme = themes[0];
  } else if (themes.length > 1) {
    merged.theme = themes;
  }

  return merged;
}
