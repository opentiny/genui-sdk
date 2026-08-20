import type { IExample } from '@opentiny/genui-sdk-core';
import formSchema from './examples/form.json' with { type: 'json' };
import infoCardSchema from './examples/info.json' with { type: 'json' };
import tableSchema from './examples/table.json' with { type: 'json' };

export const examples = [
  { id: 'form', name: '双向绑定的表单', schema: formSchema },
  { id: 'info', name: '信息展示卡片', schema: infoCardSchema },
  { id: 'table', name: '数据表格', schema: tableSchema },
] as IExample[];
