import type { MaterialsThemeFactory } from './materials-theme';

export type IMaterialComponent = unknown;

export type IMaterialsMap = Record<string, IMaterialComponent>;

export interface IMaterials {
  components?: IMaterialsMap;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
  createTheme?: MaterialsThemeFactory;
  [key: string]: any;
}

export type MergedMaterials = Omit<IMaterials, 'createTheme'> & {
  createTheme?: MaterialsThemeFactory | MaterialsThemeFactory[];
};
