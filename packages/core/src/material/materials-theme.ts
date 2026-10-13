/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export type ThemeColorScheme = 'light' | 'dark';

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export interface IThemeDescriptor {
  id: string;
  colorScheme?: ThemeColorScheme;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export interface IThemeApplyContext {
  systemColorScheme: ThemeColorScheme;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export type ThemeDisposer = () => void;

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export interface IThemeApplyResult {
  descriptor: IThemeDescriptor;
  dispose?: ThemeDisposer;
  root?: unknown;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export interface IMaterialsTheme {
  themes?: IThemeDescriptor[];
  apply(theme: string, ctx: IThemeApplyContext): IThemeApplyResult;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export type MaterialsThemeFactory = () => IMaterialsTheme;
