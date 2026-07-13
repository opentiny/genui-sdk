import { cardSchema, type IExample } from '@opentiny/genui-sdk-core';
import formSchema from './examples/form.json' with { type: 'json' };
import infoCardSchema from './examples/info.json' with { type: 'json' };
import gridSchema from './examples/grid.json' with { type: 'json' };
import tabsSchema from './examples/tabs.json' with { type: 'json' };

// JSON引入时，TS 会把字符串推断成 string，而不是字面量 'JSFunction'，所以需要转换一下
function createExample(id: string, name: string, schema: unknown): IExample {
  return { id, name, schema: cardSchema.parse(schema) };
}

export const examples: IExample[] = [
  createExample('form', '双向绑定的表单', formSchema),
  createExample('info', '信息展示卡片', infoCardSchema),
  createExample('grid', '表格卡片', gridSchema),
  createExample('tabs', 'Tabs卡片', tabsSchema),
];
