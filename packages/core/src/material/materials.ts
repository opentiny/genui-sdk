import type { MaterialsThemeFactory } from './materials-theme';

export type IMaterialComponent = unknown;

export type IMaterialsMap = Record<string, IMaterialComponent>;

export interface IMaterials {
  components?: IMaterialsMap;
  /** 区块注册表，key 为区块组件名 */
  blocks?: Record<string, any>;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
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
