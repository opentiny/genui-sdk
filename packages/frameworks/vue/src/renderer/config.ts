export const requiredCompleteFieldSelectors = [
  '[componentName=Img] > props > src',
  'componentName',
  'style',
  '[type=JSFunction]',
  '[type=JSExpression]',
  '[type=JSSlot][value=]',
  'type',
  ':empty:object',
  '[componentName=TinyTabItem] > props > name',
  '[componentName=TinyTransfer] > props > data',
  '[componentName=TinyNumeric] > props > controlsPosition',
  '[componentName=TinyNumeric] > props > modelValue',
  '[componentName^=TinyChart] > props > *',
  '[componentName=TinyForm] > props > labelPosition',
  // ng element version
  '[componentName=img] > props > src',
  '[componentName] > props > ngModel',
];
