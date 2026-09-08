export type IMaterialComponent = unknown;

export type IMaterialsMap = Record<string, IMaterialComponent>;

/** Bridge for UI-library built-in i18n (not GenUI app copy). */
export interface IMaterialsI18n {
  /** GenUI locale: zh_CN / en_US */
  setLocale(locale: string): void;
  /** Optional locale wrapper component (e.g. ElConfigProvider). */
  LocaleProvider?: unknown;
  /** Nested wrappers after mergeMaterials; prefer over LocaleProvider when set. */
  LocaleProviders?: unknown[];
}

export interface IMaterials {
  components?: IMaterialsMap;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
  i18n?: IMaterialsI18n;
  [key: string]: any;
}

/** Invoke materials.i18n.setLocale when present. */
export function applyMaterialsLocale(
  materials: IMaterials | undefined | null,
  locale: string,
): void {
  const trimLocale = locale?.trim?.() ?? locale;
  if (!trimLocale || !materials?.i18n?.setLocale) {
    return;
  }
  materials.i18n.setLocale(trimLocale);
}

/**
 * Resolve locale host wrappers from a materials i18n bridge.
 * Prefers LocaleProviders; falls back to a single LocaleProvider.
 */
export function getMaterialsLocaleProviders(
  i18n: IMaterialsI18n | undefined | null,
): unknown[] {
  if (!i18n) {
    return [];
  }
  if (i18n.LocaleProviders && i18n.LocaleProviders.length > 0) {
    return i18n.LocaleProviders.filter(Boolean);
  }
  return i18n.LocaleProvider ? [i18n.LocaleProvider] : [];
}
