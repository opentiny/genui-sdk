import type { MaterialsThemeFactory } from './materials-theme';

export type IMaterialComponent = unknown;

export type IMaterialsMap = Record<string, IMaterialComponent>;

export interface IMaterials {
  components?: IMaterialsMap;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
  /**
   * 物料使用的组件库模式。设置后 GenuiRenderer 会向渲染子树注入 TinyMode，
   * 供支持多端的组件（如 TinyVue）在运行时选择对应模板。
   */
  mode?: 'pc' | 'mobile' | 'mobile-first';
  /**
   * @experimental 实验特性，API 可能在后续版本中发生变更。
   */
  themeFactory?: MaterialsThemeFactory;
  [key: string]: any;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export type MergedMaterials = Omit<IMaterials, 'themeFactory'> & {
  /**
   * @experimental 实验特性，API 可能在后续版本中发生变更。
   */
  themeFactory?: MaterialsThemeFactory | MaterialsThemeFactory[];
};
