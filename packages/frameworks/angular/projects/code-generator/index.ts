export * from './types';
export * from './materials';
export { AngularCodeGenerator } from './angular-code-generator';
export { CodeGeneratorBase } from './code-generator-base';

// 这里刻意不再透出 generateCode 便捷入口:物料配置是必传的,唯一入口即构造器——
//   import { TINYNG_CONFIG } from '@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator';
//   await new AngularCodeGenerator({ materials: [TINYNG_CONFIG] }).generate({ pageInfo: { schema } });
// 出码器本身不 import 任何物料包,换库只换调用方那一行 import。
