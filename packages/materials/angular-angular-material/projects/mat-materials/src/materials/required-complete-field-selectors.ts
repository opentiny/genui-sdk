/**
 * DeltaPatcher 在流式 JSON 未闭合时跳过这些路径，避免半截枚举/绑定让 CVA 反复写值。
 * JSExpression / JSFunction 由渲染器内置选择器覆盖。
 */
export const baseRequiredCompleteFieldSelectors: string[] = [
  '[componentName=MatButtonToggle] > props > value',
  '[componentName=MatButtonToggleGroup] > props > value',
  '[componentName=MatRadioButton] > props > value',
  '[componentName=MatRadioGroup] > props > value',
  '[componentName=MatOption] > props > value',
  '[componentName=MatSelect] > props > value',
  '[componentName=MatSlideToggle] > props > checked',
  '[componentName=MatCheckbox] > props > checked',
  '[componentName=MatButtonToggleGroup] > props > name',
  '[componentName=MatRadioGroup] > props > name',
  '[componentName=MatSlideToggle] > props > name',
  '[componentName=MatCheckbox] > props > name',
  '[componentName=MatSelect] > props > name',
  '[componentName=MatFormField] > props > appearance',
  '[componentName=MatTextColumn] > props > name',
  '[componentName=MatTextColumn] > props > headerText',
  '[componentName] > props > matColumnDef',
];

export const plusRequiredCompleteFieldSelectors: string[] = [
  ...baseRequiredCompleteFieldSelectors,
  '[componentName=MatTab] > props > label',
  '[componentName=MatTabs] > props > selectedIndex',
  '[componentName=MatTabGroup] > props > selectedIndex',
];

export const maxRequiredCompleteFieldSelectors: string[] = [
  ...plusRequiredCompleteFieldSelectors,
];

export const proRequiredCompleteFieldSelectors: string[] = [
  ...maxRequiredCompleteFieldSelectors,
  '[componentName=MatChipOption] > props > value',
  '[componentName=MatChipOption] > props > selected',
  '[componentName=MatChipListbox] > props > value',
];
