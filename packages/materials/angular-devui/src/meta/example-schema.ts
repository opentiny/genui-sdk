import type { IExample } from '@opentiny/genui-sdk-core';
import infoCardSchema from './examples/info.json' with { type: 'json' };
import tableSchema from './examples/table.json' with { type: 'json' };
import chartSchema from './examples/chart.json' with { type: 'json' };

export const examples = [
  { id: 'info', name: '信息展示卡片', schema: infoCardSchema },
  { id: 'table', name: '数据表格', schema: tableSchema },
  { id: 'chart', name: '折线图', schema: chartSchema },
] as IExample[];
