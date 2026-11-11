import list_content_query from '../mock/scenarios/list-content-query.json';
import basic_widgets from '../mock/scenarios/basic-widgets.json';
import multi_select from '../mock/scenarios/multi-select.json';
import tabs from '../mock/scenarios/tabs.json';
import table from '../mock/scenarios/table.json';
import card_form from '../mock/scenarios/card-form.json';
import template_form from '../mock/scenarios/template-form.json';
import structural from '../mock/scenarios/structural.json';
import block_projection from '../mock/scenarios/block-projection.json';
import block_content_refs from '../mock/scenarios/block-content-refs.json';

export interface DemoScenario {
  id: string;
  label: string;
  schema: object;
}

/** Demo pages split out of the former single schema.json. */
export const demoScenarios: DemoScenario[] = [
  { id: 'list-content-query', label: 'ContentChild 列表', schema: list_content_query },
  { id: 'basic-widgets', label: '基础组件', schema: basic_widgets },
  { id: 'multi-select', label: '多选', schema: multi_select },
  { id: 'tabs', label: '页签', schema: tabs },
  { id: 'table', label: '表格', schema: table },
  { id: 'card-form', label: '卡片表单', schema: card_form },
  { id: 'template-form', label: '模板驱动表单', schema: template_form },
  { id: 'structural', label: '结构指令', schema: structural },
  { id: 'block-projection', label: 'Block 投影', schema: block_projection },
  { id: 'block-content-refs', label: 'Block contentRefs', schema: block_content_refs },
];
