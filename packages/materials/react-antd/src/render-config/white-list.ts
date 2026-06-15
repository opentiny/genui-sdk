import { builtinWhiteList } from './builtin-white-list';

/** Ant Design componentName whitelist for genPrompt */
export const antdWhiteList = [
  'AntButton',
  'AntInput',
  'AntSelect',
  'AntForm',
  'AntFormItem',
  'AntCard',
  'AntTable',
  'AntTabs',
  'AntModal',
  'AntSwitch',
  'AntCheckbox',
  'AntRadio',
  'AntDatePicker',
];

/** builtin + antd 完整白名单 */
export const whiteList = [...builtinWhiteList, ...antdWhiteList];
