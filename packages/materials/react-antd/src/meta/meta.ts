import type { IMaterialsMeta, IExample, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { builtinWhiteList, whiteList } from './white-list';

export type { IMaterialsMeta, IExample } from '@opentiny/genui-sdk-core';

const builtinMaterials = {
  data: {
    framework: 'React',
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
} as IMaterialsProtocol;

function filterExamples(ids: string[]) {
  return allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));
}

export const materialsMeta: IMaterialsMeta = {
  materials: [builtinMaterials, bundleJson] as IMaterialsProtocol[],
  examples: filterExamples(['antd-form', 'list', 'table']),
  whiteList,
  wrapperComponent: 'AntCard',
};
