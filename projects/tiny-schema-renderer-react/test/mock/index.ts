import type { RootNode } from '@opentiny/genui-sdk-core';
import formValidationSchema from './form-validation.json';
import tableSchema from './table.json';
import tabsSchema from './tabs.json';
import emptyChildrenSchema from './empty-children.json';

export interface DemoItem {
  id: string;
  label: string;
  schema: RootNode;
}

/**
 * 所有 mock 示例的索引，供测试页面切换展示。
 */
export const demos: DemoItem[] = [
  { id: 'form', label: '表单校验', schema: formValidationSchema as RootNode },
  { id: 'table', label: '表格渲染', schema: tableSchema as RootNode },
  { id: 'tabs', label: 'Tabs 渲染', schema: tabsSchema as RootNode },
  { id: 'empty', label: '空 children（Loading）', schema: emptyChildrenSchema as RootNode },
];
