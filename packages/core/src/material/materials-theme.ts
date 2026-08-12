export type ThemeColorScheme = 'light' | 'dark';

export interface ThemeDescriptor {
  id: string;
  label?: string;
  colorScheme?: ThemeColorScheme;
}

export interface ThemeApplyContext {
  scopeId: string;
  rootEl?: HTMLElement | null;
  systemColorScheme: ThemeColorScheme;
}

export type ThemeDisposer = () => void;

export interface IMaterialsTheme {
  themes?: ThemeDescriptor[];
  apply(theme: string, ctx: ThemeApplyContext): void | ThemeDisposer;
  Root?: unknown;
}
