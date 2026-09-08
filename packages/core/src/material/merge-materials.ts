import { getMaterialsLocaleProviders, type IMaterials, type IMaterialsI18n } from './materials';

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

export function mergeMaterials(...list: IMaterials[]): IMaterials {
  const result: IMaterials = {
    components: {},
    defaultPropsMap: {},
    requiredCompleteFieldSelectors: [],
  };

  const i18nAdapters: IMaterialsI18n[] = [];

  for (const item of list) {
    if (!item) continue;
    Object.assign(result.components!, item.components ?? {});
    Object.assign(result.defaultPropsMap!, item.defaultPropsMap ?? {});
    result.requiredCompleteFieldSelectors!.push(
      ...(item.requiredCompleteFieldSelectors ?? []),
    );
    if (item.i18n) {
      i18nAdapters.push(item.i18n);
    }
  }

  const mergedI18n = composeMaterialsI18n(i18nAdapters);
  if (mergedI18n) {
    result.i18n = mergedI18n;
  }

  return result;
}
