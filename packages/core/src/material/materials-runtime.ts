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
 * 运行时配置。
 * - `theme`：框架层已解析，未配置时为 `'light'`。
 * - `locale`：只在 ConfigProvider 显式传入 `locale` 时有值，否则为 `undefined`。
 *   作用域内的 Provider（如 Ant Design、Element Plus）可以在 `undefined` 时回退到默认语言包；
 *   通过全局 API 切换语言的组件库（如 OpenTiny Vue 的 `tinyUse`、TinyNG 的 `TiLocale.setLocale`）
 *   应在 `undefined` 时跳过，避免改写宿主应用已有的语言。
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export interface IMaterialsRuntimeConfig {
  theme: string;
  locale?: MaterialsLocaleId;
}

/**
 * 读取系统深浅色偏好，供 `auto` 主题自行解析。
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export function getSystemColorScheme(): ThemeColorScheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
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
  apply(config: Readonly<IMaterialsRuntimeConfig>): IMaterialsRuntimeApplyResult;
  dispose?(): void;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export type MaterialsRuntimeFactory = () => IMaterialsRuntime;
