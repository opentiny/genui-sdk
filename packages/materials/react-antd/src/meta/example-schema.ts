import type { IExample } from '@opentiny/genui-sdk-core';
import antdFormSchema from './examples/antd-form.json' with { type: 'json' };
import listSchema from './examples/list.json' with { type: 'json' };
import tableSchema from './examples/table.json' with { type: 'json' };

export const examples = [
  { id: 'antd-form', name: 'Ant Design 表单', schema: antdFormSchema },
  { id: 'list', name: '简单列表', schema: listSchema },
  { id: 'table', name: '数据表格', schema: tableSchema },
] as IExample[];
