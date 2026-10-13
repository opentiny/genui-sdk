import type { MaterialsThemeFactory } from './materials-theme';

export type IMaterialComponent = unknown;

export type IMaterialsMap = Record<string, IMaterialComponent>;

export interface IMaterials {
  components?: IMaterialsMap;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
  themeFactory?: MaterialsThemeFactory;
  /** 页面可用的工具函数注册表，运行时注入渲染上下文，通过 this.utils.xxx 调用 */
  utils?: Record<string, unknown>;
  [key: string]: any;
}

export type MergedMaterials = Omit<IMaterials, 'themeFactory'> & {
  themeFactory?: MaterialsThemeFactory | MaterialsThemeFactory[];
};
