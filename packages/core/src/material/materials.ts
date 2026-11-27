import type { MaterialsRuntimeFactory } from './materials-runtime';

export type IMaterialComponent = unknown;

export type IMaterialsMap = Record<string, IMaterialComponent>;

export interface IMaterials {
  components?: IMaterialsMap;
  requiredCompleteFieldSelectors?: string[];
  defaultPropsMap?: Record<string, any>;
  /**
   * @experimental 实验特性，API 可能在后续版本中发生变更。
   */
  runtimeFactory?: MaterialsRuntimeFactory;
  [key: string]: any;
}

/**
 * @experimental 实验特性，API 可能在后续版本中发生变更。
 */
export type MergedMaterials = Omit<IMaterials, 'runtimeFactory'> & {
  /**
   * @experimental 实验特性，API 可能在后续版本中发生变更。
   */
  runtimeFactory?: MaterialsRuntimeFactory | MaterialsRuntimeFactory[];
};
