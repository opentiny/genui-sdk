import '@opentiny/vue-runtime/dist3/tailwind.css';
import './mobile-fixes.css';
import './design-config';
import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { mobileMaterialsMeta } from '../meta';
import { components } from './components';

const requiredCompleteFieldSelectors = [
  '[componentName=TinyNumeric] > props > controlsPosition',
  '[componentName=TinyNumeric] > props > modelValue',
  '[componentName=TinyForm] > props > labelPosition',
  '[componentName=TinyRadioGroup] > props > options > * > label',
  '[componentName=TinyTabItem] > props > name',
];

export const materials: IMaterials & { mode: 'mobile-first' } = {
  components,
  mode: 'mobile-first',
  requiredCompleteFieldSelectors,
  defaultPropsMap: {
    ...buildMaterialDefaultValueMap(mobileMaterialsMeta),
    TinyCard: { 'auto-width': true },
  },
};
