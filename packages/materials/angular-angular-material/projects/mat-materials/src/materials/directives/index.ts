export {
  baseAutoApplyDirectives,
  baseDirectives,
} from './base-directives';
export {
  tableAutoApplyDirectives,
  tableDirectives,
} from './table-directives';
export {
  layoutAutoApplyDirectives,
  layoutDirectives,
  MatExpansionPanelParentBridge,
} from './layout-directives';
export {
  feedbackAutoApplyDirectives,
  feedbackDirectives,
} from './feedback-directives';
export {
  dataAutoApplyDirectives,
  dataDirectives,
} from './data-directives';

import { baseAutoApplyDirectives, baseDirectives } from './base-directives';
import { tableAutoApplyDirectives, tableDirectives } from './table-directives';
import { layoutAutoApplyDirectives, layoutDirectives } from './layout-directives';
import { feedbackAutoApplyDirectives, feedbackDirectives } from './feedback-directives';
import { dataAutoApplyDirectives, dataDirectives } from './data-directives';

/** 全量指令（pro），保持旧导出名兼容 */
export const directives = {
  ...baseDirectives,
  ...tableDirectives,
  ...layoutDirectives,
  ...feedbackDirectives,
  ...dataDirectives,
};

export const autoApplyDirectives = {
  ...baseAutoApplyDirectives,
  ...tableAutoApplyDirectives,
  ...layoutAutoApplyDirectives,
  ...feedbackAutoApplyDirectives,
  ...dataAutoApplyDirectives,
};
