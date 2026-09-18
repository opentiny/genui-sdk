/**
 * 出码配置出口——本物料包提供给「Angular 出码器」的配置与推导工具。
 *
 * 刻意**不并入主入口 src/index.ts**:本入口会副作用加载 @angular/compiler,
 * 而主入口是渲染器侧的运行时依赖,不该无端背上 JIT 编译器。
 * 出码器/使用方按子路径 `@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator` 引入。
 */
export * from './types';
export * from './derive-library-maps';
export * from './config';
