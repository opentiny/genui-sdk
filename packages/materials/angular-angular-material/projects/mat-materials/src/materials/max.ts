import { buildMaterialDefaultValueMap } from '@opentiny/genui-sdk-core';
import { maxMaterialsMeta } from '../meta';
import type { IMatMaterials } from './types';
import { plusMaterials } from './plus';
import { feedbackComponents, feedbackModules } from './components/feedback-components';
import { feedbackAutoApplyDirectives, feedbackDirectives } from './directives/feedback-directives';

/**
 * max 物料：plus + 反馈指示器（Progress）+ Menu。
 * Dialog / SnackBar / BottomSheet 为服务打开，不纳入 schema 根组件。
 */
export const maxMaterials: IMatMaterials = {
  components: { ...plusMaterials.components, ...feedbackComponents },
  modules: { ...plusMaterials.modules, ...feedbackModules },
  directives: { ...plusMaterials.directives, ...feedbackDirectives },
  autoApplyDirectives: { ...plusMaterials.autoApplyDirectives, ...feedbackAutoApplyDirectives },
  defaultPropsMap: buildMaterialDefaultValueMap(maxMaterialsMeta),
};
