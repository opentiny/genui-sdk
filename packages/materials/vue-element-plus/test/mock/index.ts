import formBindingSchema from './form-binding.json';
import tableSchema from './table.json';
import infoCardSchema from './info-card.json';
import tabsSchema from './tabs.json';

export interface DemoItem {
  id: string;
  label: string;
  schema: Record<string, unknown>;
}

export const demos: DemoItem[] = [
  { id: 'form-binding', label: '表单双向绑定', schema: formBindingSchema },
  { id: 'table', label: '表格渲染', schema: tableSchema },
  { id: 'info-card', label: '信息展示卡片', schema: infoCardSchema },
  { id: 'tabs', label: 'Tabs 渲染', schema: tabsSchema },
];
