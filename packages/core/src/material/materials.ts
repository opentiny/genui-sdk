import type { MaterialsRuntimeFactory } from './materials-runtime';

export type IMaterialComponent = unknown;

export type IMaterialsMap = Record<string, IMaterialComponent>;

export interface IMaterials {
  components?: IMaterialsMap;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
  runtimeFactory?: MaterialsRuntimeFactory;
  [key: string]: any;
}

export type MergedMaterials = Omit<IMaterials, 'runtimeFactory'> & {
  runtimeFactory?: MaterialsRuntimeFactory | MaterialsRuntimeFactory[];
};
