import type { IMaterialsTheme } from './materials-theme';

export type IMaterialComponent = unknown;

export type IMaterialsMap = Record<string, IMaterialComponent>;

export interface IMaterials {
  components?: IMaterialsMap;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
  theme?: IMaterialsTheme | IMaterialsTheme[];
  [key: string]: any;
}
