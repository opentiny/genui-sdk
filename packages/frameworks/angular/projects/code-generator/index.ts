import { AngularCodeGeneratorBase } from './angular-code-generator-base';

export * from './types';
export * from './libraries';
export { AngularCodeGeneratorBase } from './angular-code-generator-base';
export { CodeGeneratorBase } from './code-generator-base';

/** 默认(opentiny-ng)出码入口——入口本体定义在 AngularCodeGeneratorBase 类内,此处仅透出保持唯一 API */
export const generateCode = AngularCodeGeneratorBase.generateCode;
