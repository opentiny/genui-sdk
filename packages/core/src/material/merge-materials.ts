import type { IMaterials, MergedMaterials } from './materials';
import type { MaterialsThemeFactory } from './materials-theme';

const handleKeys = ['components', 'requiredCompleteFieldSelectors', 'defaultPropsMap', 'themeFactory'];

// These are name → value maps. A later pack may ship an empty map (Angular Material
// standalone components do). Replacing the whole map would drop earlier NgModules.
const recordKeys = ['modules', 'directives', 'autoApplyDirectives', 'directivesModuleMap', 'blocks'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
      const incoming = (src as Record<string, unknown>)[key];
      if (recordKeys.includes(key) && isRecord(incoming)) {
        const current = extra[key];
        extra[key] = { ...(isRecord(current) ? current : {}), ...incoming };
        continue;
      }
      extra[key] = incoming;
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
