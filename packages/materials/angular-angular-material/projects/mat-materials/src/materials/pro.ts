import { buildMaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import { proMaterialsMeta } from '../meta';
import type { IMatMaterials } from './types';
import { maxMaterials } from './max';
import { dataComponents, dataModules } from './components/data-components';
import { dataAutoApplyDirectives, dataDirectives } from './directives/data-directives';

/**
 * pro 物料：max + 数据展示（碎片 / Paginator / Table / Tree / Sort），全量物料。
 */
export const proMaterials: IMatMaterials = {
  components: { ...maxMaterials.components, ...dataComponents },
  modules: { ...maxMaterials.modules, ...dataModules },
  directives: { ...maxMaterials.directives, ...dataDirectives },
  autoApplyDirectives: { ...maxMaterials.autoApplyDirectives, ...dataAutoApplyDirectives },
  defaultPropsMap: buildMaterialDefaultValueMap(proMaterialsMeta),
};
