export type ThemeColorScheme = 'light' | 'dark';

export interface IThemeDescriptor {
  id: string;
  colorScheme?: ThemeColorScheme;
}

export interface IThemeApplyContext {
  systemColorScheme: ThemeColorScheme;
}

export type ThemeDisposer = () => void;

export interface IThemeApplyResult {
  descriptor: IThemeDescriptor;
  dispose: ThemeDisposer;
  Root?: unknown;
}

export interface IMaterialsTheme {
  themes?: IThemeDescriptor[];
  apply(theme: string, ctx: IThemeApplyContext): IThemeApplyResult;
}

export type MaterialsThemeFactory = () => IMaterialsTheme;
