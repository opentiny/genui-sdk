import type { IRendererConfig } from '@opentiny/genui-sdk-core';
import antdBundle from './bundle.json' with { type: 'json' };
import { builtinWhiteList } from './builtin-white-list';
import { whiteList } from './white-list';
import { examples } from './example-schema';

/** builtin + 原生 HTML 的 genPrompt 物料描述 */
const builtinMaterials = {
  data: {
    framework: 'React' as const,
    materials: {
      components: builtinWhiteList.map((name) => ({
        component: name,
        schema: {
          properties: [
            {
              label: { zh_CN: '属性' },
              content: [
                { property: 'style', type: 'string', defaultValue: '' },
                { property: 'className', type: 'string', defaultValue: '' },
                { property: 'text', type: 'string', defaultValue: '' },
                { property: 'value', type: 'string', defaultValue: '' },
                { property: 'placeholder', type: 'string', defaultValue: '' },
              ],
            },
          ],
        },
      })),
    },
  },
};

export const reactAntdRendererConfig: IRendererConfig = {
  materialsList: [builtinMaterials, antdBundle],
  whiteList,
  examples,
  wrapperComponent: 'AntCard',
};
