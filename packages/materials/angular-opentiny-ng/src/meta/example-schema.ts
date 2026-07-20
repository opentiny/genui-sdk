import type { IExample } from '@opentiny/genui-sdk-core';
import formSchema from './examples/form.json' with { type: 'json' };
import infoCardSchema from './examples/info.json' with { type: 'json' };
import gridSchema from './examples/grid.json' with { type: 'json' };
import tabsSchema from './examples/tabs.json' with { type: 'json' };
import paginationSchema from './examples/pagination.json' with { type: 'json' };

export const examples = [
  { id: 'form', name: '双向绑定的表单', schema: formSchema },
  { id: 'info', name: '信息展示卡片', schema: infoCardSchema },
  { id: 'grid', name: '表格卡片', schema: gridSchema },
  { id: 'tabs', name: 'Tabs卡片', schema: tabsSchema },
  { id: 'pagination', name: '分页表格', schema: paginationSchema },
] as IExample[];
