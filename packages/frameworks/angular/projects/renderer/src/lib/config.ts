export const requiredCompleteFieldSelectors = [ // TODO: move to core & material package
  'componentName',
  'style',
  '[type=JSFunction]',
  '[type=JSExpression]',
  'type',
  ':empty:object',
  '[componentName=Page] > css',
  // ng
  '[componentName=img] > props > src',
  '[componentName] > props > ngModel',
];
