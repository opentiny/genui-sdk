import type { IMaterialsMeta, IExample, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json' with { type: 'json' };
import chartJson from './materials/chart.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { whiteList } from './white-list';

const metaMaterials = [chartJson, bundleJson] as unknown as IMaterialsProtocol[];

function filterExamples(ids: string[]) {
  return allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));
}

export const materialsMeta: IMaterialsMeta = {
  materials: metaMaterials,
  wrapperComponent: 'DCard',
  whiteList,
  examples: filterExamples(['info', 'table', 'chart']),
  rules: [
    '表格列必须使用 DColumn，并通过 field/header 配置',
    '图表必须设置 options，且 series.type 与组件类型一致（line/bar/pie）',
  ],
};
