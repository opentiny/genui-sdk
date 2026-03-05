export const requiredCompleteFieldSelectors = [ // TODO: move to core & material package
  'componentName',
  'style',
  '[type=JSFunction]',
  '[type=JSExpression]',
  '[type=JSSlot][value=]',
  'type',
  ':empty:object',
  // ng
  '[componentName=img] > props > src',
  '[componentName] > props > ngModel',
];
