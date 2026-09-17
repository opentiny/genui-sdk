import {
  getMaterialsLocaleProviders,
  type IMaterials,
  type IMaterialsI18n,
  type MergedMaterials,
} from './materials';
import type { MaterialsThemeFactory } from './materials-theme';

function composeMaterialsI18n(adapters: IMaterialsI18n[]): IMaterialsI18n | undefined {
  if (adapters.length <= 1) {
    return adapters[0];
  }

  const providers = adapters.flatMap((adapter) => getMaterialsLocaleProviders(adapter));

  const composed: IMaterialsI18n = {
    setLocale(locale: string) {
      adapters.forEach((adapter) => adapter.setLocale(locale));
    },
  };

  if (providers.length === 1) {
    composed.LocaleProvider = providers[0];
  } else if (providers.length > 1) {
    // Nest order matches mergeMaterials argument order (outer → inner).
    composed.LocaleProviders = providers;
  }

  return composed;
}
const handleKeys = [
  'components',
  'requiredCompleteFieldSelectors',
  'defaultPropsMap',
  'i18n',
  'themeFactory',
];

export function mergeMaterials(...sources: (IMaterials | undefined)[]): MergedMaterials {
  const components: Record<string, unknown> = {};
  const requiredCompleteFieldSelectors: string[] = [];
  const defaultPropsMap: Record<string, any> = {};
  const themes: MaterialsThemeFactory[] = [];
  const seenThemes = new Set<MaterialsThemeFactory>();
  const i18nAdapters: IMaterialsI18n[] = [];
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
    if (src.i18n) {
      i18nAdapters.push(src.i18n);
    }
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
    ...extra,
  };

  if (themes.length > 0) {
    merged.themeFactory = themes;
  }

  const mergedI18n = composeMaterialsI18n(i18nAdapters);
  if (mergedI18n) {
    merged.i18n = mergedI18n;
  }

  return merged;
}
