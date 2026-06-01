import type { IRendererConfig } from '@opentiny/genui-sdk-core';
import { whiteList } from './white-list';
import { examples, nativeFormExample } from './example-schema';

/** Minimal materials for genPrompt — native HTML only, no Tiny* components */
const minimalMaterials = {
  data: {
    framework: 'React' as const,
    materials: {
      components: whiteList.map((name) => ({
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

export const reactRendererConfig: IRendererConfig = {
  materialsList: [minimalMaterials],
  examples,
  whiteList,
};

export { whiteList, examples, nativeFormExample };
