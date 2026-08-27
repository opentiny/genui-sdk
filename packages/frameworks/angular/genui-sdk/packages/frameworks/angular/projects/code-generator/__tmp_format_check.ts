/**
 * 临时验证脚本：验证 formatWithPrettier 两段式格式化。验证后删除。
 * 运行：cd projects/code-generator && npx tsx __tmp_format_check.ts
 */
import { generateCode } from './generators/tinyng-generator';
import type { CardSchema } from '@opentiny/genui-sdk-core';

const demo = {
  componentName: 'Page',
  state: {
    list: [
      { id: '1', name: '张三' },
      { id: '2', name: '李四' },
    ],
    title: '测试页面',
  },
  methods: {},
  children: [
    {
      componentName: 'TiCard',
      children: [
        {
          componentName: 'h2',
          children: '页面标题',
        },
        {
          componentName: 'div',
          props: {
            style: 'color: red;',
          },
          children: [
            {
              componentName: 'Text',
              props: {
                text: { type: 'JSExpression', value: 'this.state.title' },
              },
            },
          ],
        },
        {
          componentName: 'ul',
          children: [
            {
              componentName: 'li',
              loop: { type: 'JSExpression', value: 'this.state.list' },
              loopArgs: ['item'],
              children: [
                {
                  componentName: 'Text',
                  props: {
                    text: { type: 'JSExpression', value: 'item.name' },
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as CardSchema;

async function run() {
  console.log('========== 未格式化 ==========');
  const raw = await generateCode({ pageInfo: { schema: demo, name: 'FormatDemo' } });
  console.log(raw.panelValue);

  console.log('\n\n========== formatWithPrettier = true ==========');
  const formatted = await generateCode({ pageInfo: { schema: demo, name: 'FormatDemo' }, formatWithPrettier: true });
  console.log(formatted.panelValue);
  console.log('\nprettierOpts:', formatted.prettierOpts);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
