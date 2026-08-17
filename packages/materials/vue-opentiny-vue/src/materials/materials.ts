import { buildMaterialDefaultValueMap, type IMaterials } from '@opentiny/genui-sdk-core';
import { materialsMeta, miniMaterialsMeta, plusMaterialsMeta } from '../meta';
import { components } from './components';

const baseRequiredCompleteFieldSelectors = [
  '[componentName=TinyNumeric] > props > controlsPosition',
  '[componentName=TinyNumeric] > props > modelValue',
  '[componentName=TinyForm] > props > labelPosition',
  '[componentName=TinyRadioGroup] > props > options > * > label',
];

const standardRequiredCompleteFieldSelectors = [
  ...baseRequiredCompleteFieldSelectors,
  '[componentName=TinyTabItem] > props > name',
  '[componentName^=TinyHuicharts] > props > options > theme',
];

const plusRequiredCompleteFieldSelectors = [
  ...standardRequiredCompleteFieldSelectors,
  '[componentName=TinyCollapseItem] > props > name',
  '[componentName=TinyCollapseItem] > props > title',
  '[componentName=TinyTransfer] > props > data',
  '[componentName=TinyCascader] > props > options',
  '[componentName=TinySteps] > props > data',
];

export const materials: IMaterials = {
  components,
  requiredCompleteFieldSelectors: standardRequiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(materialsMeta),
};

export const miniMaterials = {
  components,
  requiredCompleteFieldSelectors: baseRequiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(miniMaterialsMeta),
};

export const plusMaterials: IMaterials = {
  components,
  requiredCompleteFieldSelectors: plusRequiredCompleteFieldSelectors,
  defaultPropsMap: buildMaterialDefaultValueMap(plusMaterialsMeta),
};
