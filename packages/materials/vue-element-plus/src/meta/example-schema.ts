import { cardSchema, type IExample } from '@opentiny/genui-sdk-core';
import formSchema from './examples/form.json' with { type: 'json' };
import infoCardSchema from './examples/info.json' with { type: 'json' };
import tableSchema from './examples/table.json' with { type: 'json' };

function createExample(id: string, name: string, schema: unknown): IExample {
  return { id, name, schema: cardSchema.parse(schema) };
}

export const examples: IExample[] = [
  createExample('form', '双向绑定的表单', formSchema),
  createExample('info', '信息展示卡片', infoCardSchema),
  createExample('table', '数据表格', tableSchema),
];
