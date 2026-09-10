import { buildMaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta';
import { basicComponents, basicModules } from './components/basic-components';
import { formComponents, formModules } from './components/form-components';
import { baseAutoApplyDirectives, baseDirectives } from './directives/base-directives';
import type { IMatMaterials } from './types';

export type { AutoApplyDirectivePattern, IMatMaterials } from './types';

/**
 * base 物料：基础组件 + 表单控件 + Card。
 * 向后兼容旧导出名 `materials`。
 */
export const materials: IMatMaterials = {
  components: { ...basicComponents, ...formComponents },
  modules: { ...basicModules, ...formModules },
  directives: { ...baseDirectives },
  autoApplyDirectives: { ...baseAutoApplyDirectives },
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
};
