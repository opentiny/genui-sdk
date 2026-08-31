export type ThemeColorScheme = 'light' | 'dark';

export interface ThemeDescriptor {
  id: string;
  colorScheme?: ThemeColorScheme;
}

export interface ThemeApplyContext {
  systemColorScheme: ThemeColorScheme;
}

export type ThemeDisposer = () => void;

export interface ThemeApplyResult {
  descriptor: ThemeDescriptor;
  dispose: ThemeDisposer;
  Root?: unknown;
}

export interface IMaterialsTheme {
  themes?: ThemeDescriptor[];
  apply(theme: string, ctx: ThemeApplyContext): ThemeApplyResult;
}

export type MaterialsThemeFactory = () => IMaterialsTheme;
