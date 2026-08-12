import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta } from '../meta';
import { components } from './components';
import { createOpenTinyMaterialsTheme } from './theme';

const baseRequiredCompleteFieldSelectors = [
  '[componentName=TinyNumeric] > props > controlsPosition',
  '[componentName=TinyNumeric] > props > modelValue',
  '[componentName=TinyForm] > props > labelPosition',
  '[componentName=TinyRadioGroup] > props > options > * > label',
];

const standardRequiredCompleteFieldSelectors = [
  ...baseRequiredCompleteFieldSelectors,
  '[componentName=TinyTabItem] > props > name',
  '[componentName=TinyTransfer] > props > data',
  '[componentName^=TinyHuicharts] > props > options > theme',
];

const theme = createOpenTinyMaterialsTheme();

export const materials: IMaterials = {
  components,
  requiredCompleteFieldSelectors: standardRequiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
  theme,
};

export const miniMaterials: IMaterials = {
  components,
  requiredCompleteFieldSelectors: baseRequiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(miniMaterialsMeta),
  theme,
};
