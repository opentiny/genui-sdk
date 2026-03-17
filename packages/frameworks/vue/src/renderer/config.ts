export const requiredCompleteFieldSelectors = [
  '[componentName=Img] > props > src',
  'componentName',
  'style',
  '[componentName=Page] > css',
  '[type=JSFunction]',
  '[type=JSExpression]',
  '[type=JSSlot][value=]',
  'type',
  ':empty:object',
  '[componentName=TinyTabItem] > props > name',
  '[componentName=TinyTransfer] > props > data',
  '[componentName=TinyNumeric] > props > controlsPosition',
  '[componentName=TinyNumeric] > props > modelValue',
  '[componentName^=TinyChart] > props > :string',
  '[componentName=TinyChartPie] > props > data > rows > *',
  '[componentName=TinyForm] > props > labelPosition',
  '[componentName=TinyForm] > props > label-position',
  '[componentName=TinyRadioGroup] > props > options > *',

  // ng element version
  '[componentName=img] > props > src',
  '[componentName] > props > ngModel',
];
