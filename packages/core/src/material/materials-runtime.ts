export type ThemeColorScheme = 'light' | 'dark';

export interface IThemeDescriptor {
  id: string;
  colorScheme?: ThemeColorScheme;
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
}

export interface IMaterialsRuntime {
  readonly themes?: readonly IThemeDescriptor[];
  /** 稳定的根组件；组件库需要 Provider 时由该根组件统一持有。 */
  readonly root?: unknown;
  apply(
    config: Readonly<IMaterialsRuntimeConfig>,
    context: Readonly<IMaterialsRuntimeContext>,
  ): IMaterialsRuntimeApplyResult;
  dispose?(): void;
}

export type MaterialsRuntimeFactory = () => IMaterialsRuntime;
