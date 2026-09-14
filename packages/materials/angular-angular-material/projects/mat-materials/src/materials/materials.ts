import { buildMaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import { materialsMeta } from '../meta';
import { basicComponents, basicModules } from './components/basic-components';
import { formComponents, formModules } from './components/form-components';
import { tableComponents, tableModules } from './components/table-components';
import { baseAutoApplyDirectives, baseDirectives } from './directives/base-directives';
import { tableAutoApplyDirectives, tableDirectives } from './directives/table-directives';
import type { IMatMaterials } from './types';

export type { AutoApplyDirectivePattern, IMatMaterials } from './types';

/**
 * base 物料：基础组件 + 表单控件 + Card + MatTable。
 * 向后兼容旧导出名 `materials`。
 */
export const materials: IMatMaterials = {
  components: { ...basicComponents, ...formComponents, ...tableComponents },
  modules: { ...basicModules, ...formModules, ...tableModules },
  directives: { ...baseDirectives, ...tableDirectives },
  autoApplyDirectives: { ...baseAutoApplyDirectives, ...tableAutoApplyDirectives },
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
};
