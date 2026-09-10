import { buildMaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import { plusMaterialsMeta } from '../meta';
import type { IMatMaterials } from './types';
import { materials as baseMaterials } from './materials';
import { layoutComponents, layoutModules } from './components/layout-components';
import { layoutAutoApplyDirectives, layoutDirectives } from './directives/layout-directives';

/**
 * plus 物料：base + 布局壳（Toolbar/List/Expansion/Sidenav/Grid）+ 导航（Tabs/TabNav）
 * + 表单增强（Datepicker / Timepicker / Autocomplete / Stepper）。
 */
export const plusMaterials: IMatMaterials = {
  components: { ...baseMaterials.components, ...layoutComponents },
  modules: { ...baseMaterials.modules, ...layoutModules },
  directives: { ...baseMaterials.directives, ...layoutDirectives },
  autoApplyDirectives: { ...baseMaterials.autoApplyDirectives, ...layoutAutoApplyDirectives },
  defaultPropsMap: buildMaterialDefaultValueMap(plusMaterialsMeta),
};
