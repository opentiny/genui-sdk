import type { IMaterialsMeta, IExample, IMaterialsProtocol } from '@opentiny/genui-sdk-core';
import bundleJson from './materials/bundle.json' with { type: 'json' };
import { examples as allExamples } from './example-schema';
import { whiteList } from './white-list';

const metaMaterials = [bundleJson] as IMaterialsProtocol[];

function filterExamples(ids: string[]) {
  return allExamples.filter((example): example is IExample => !!example.id && ids.includes(example.id));
}

export const materialsMeta: IMaterialsMeta = {
  materials: metaMaterials,
  wrapperComponent: 'ElCard',
  whiteList,
  examples: filterExamples(['form', 'info', 'table']),
  rules: [
    '表单控件（ElInput、ElSelect、ElDatePicker、ElRadioGroup、ElSwitch、ElCheckbox 等）的 modelValue 必须双向绑定到 state：props 写成 {"type":"JSExpression","model":true,"value":"this.state.xxx"}，并在根级 state 中先声明 xxx 的初始值；禁止写成静态值，否则输入/选择后无法回显。ElSelect 下的每个 ElOption 必须同时配置 label 和 value。',
  ],
};
