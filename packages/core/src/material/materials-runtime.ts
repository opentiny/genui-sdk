export type ThemeColorScheme = 'light' | 'dark';

export interface IThemeDescriptor {
  id: string;
  colorScheme?: ThemeColorScheme;
}

/** ConfigProvider.locale 与物料 `locales` 的规范 id，推荐 `语言_地区`（如 `zh_CN`），不限制官方枚举。 */
export type MaterialsLocaleId = string;

export interface ILocaleDescriptor {
  id: MaterialsLocaleId;
}

export interface IMaterialsRuntimeConfig {
  theme: string;
  locale: string;
}

export interface IMaterialsRuntimeContext {
  systemColorScheme: ThemeColorScheme;
}

export interface IMaterialsRuntimeApplyResult {
  theme?: IThemeDescriptor;
  locale?: ILocaleDescriptor;
}

export interface IMaterialsRuntime {
  readonly themes?: readonly IThemeDescriptor[];
  readonly locales?: readonly ILocaleDescriptor[];
  /** 稳定的根组件；组件库需要 Provider 时由该根组件统一持有。 */
  readonly root?: unknown;
  apply(
    config: Readonly<IMaterialsRuntimeConfig>,
    context: Readonly<IMaterialsRuntimeContext>,
  ): IMaterialsRuntimeApplyResult;
  dispose?(): void;
}

export type MaterialsRuntimeFactory = () => IMaterialsRuntime;
