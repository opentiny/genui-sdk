import type { MaterialsThemeFactory } from './materials-theme';

export type IMaterialComponent = unknown;

export type IMaterialsMap = Record<string, IMaterialComponent>;

export interface IMaterials {
  components?: IMaterialsMap;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
  themeFactory?: MaterialsThemeFactory;
  [key: string]: any;
}

export type MergedMaterials = Omit<IMaterials, 'themeFactory'> & {
  themeFactory?: MaterialsThemeFactory | MaterialsThemeFactory[];
};
