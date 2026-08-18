export type ThemeColorScheme = 'light' | 'dark';

export interface ThemeDescriptor {
  id: string;
  label?: string;
  colorScheme?: ThemeColorScheme;
}

export type ThemeRootProps = Record<string, unknown>;

export interface ThemeApplyContext {
  scopeId: string;
  rootEl?: HTMLElement | null;
  systemColorScheme: ThemeColorScheme;
  colorScheme?: ThemeColorScheme;
  rootInstance?: unknown;
}

export type ThemeDisposer = () => void;

export interface ThemeApplyResult {
  id: string;
  dispose: ThemeDisposer;
  props?: ThemeRootProps;
}

export interface IMaterialsTheme {
  themes?: ThemeDescriptor[];
  apply(theme: string, ctx: ThemeApplyContext): ThemeApplyResult;
  Root?: unknown;
}

export function lookupColorScheme(
  themeId: string,
  themes: ThemeDescriptor[] | undefined,
  fallback: ThemeColorScheme,
): ThemeColorScheme {
  return themes?.find((item) => item.id === themeId)?.colorScheme ?? fallback;
}

export function resolveColorSchemeFromApplied(
  results: { themes?: ThemeDescriptor[]; id: string }[],
  fallback: ThemeColorScheme,
): ThemeColorScheme {
  for (const item of results) {
    const scheme = item.themes?.find((theme) => theme.id === item.id)?.colorScheme;
    if (scheme) {
      return scheme;
    }
  }
  return fallback;
}
