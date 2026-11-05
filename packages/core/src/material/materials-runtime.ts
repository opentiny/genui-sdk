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
 * ConfigProvider.locale 与物料 `locales` 的规范 id，推荐 `语言_地区`（如 `zh_CN`），不限制官方枚举。
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export type MaterialsLocaleId = string;

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export interface ILocaleDescriptor {
  id: MaterialsLocaleId;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export interface IMaterialsRuntimeConfig {
  theme: string;
  locale: string;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export interface IMaterialsRuntimeContext {
  systemColorScheme: ThemeColorScheme;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export interface IMaterialsRuntimeApplyResult {
  theme?: IThemeDescriptor;
  locale?: ILocaleDescriptor;
  /** 本次 apply 生效的根组件；组件库需要 Provider 时由该根组件统一持有。 */
  root?: unknown;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export interface IMaterialsRuntime {
  readonly themes?: readonly IThemeDescriptor[];
  readonly locales?: readonly ILocaleDescriptor[];
  apply(
    config: Readonly<IMaterialsRuntimeConfig>,
    context: Readonly<IMaterialsRuntimeContext>,
  ): IMaterialsRuntimeApplyResult;
  dispose?(): void;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export type MaterialsRuntimeFactory = () => IMaterialsRuntime;
