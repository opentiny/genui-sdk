// libraries/ 汇总导出——这里是「组件库」相关的抽象与实现,不是生成器。
// 生成器本体在父目录(CodeGeneratorBase / AngularCodeGeneratorBase)。
// 目录约定:
//   - 根目录:跨组件库通用的抽象(prop-adapter / derive-library-maps)
//   - 子目录:每个组件库一组实现,如 tinyng/(map 映射推导 / prop-adapters 特判 / config 库配置)
// 组件库注册表与出码入口收在 AngularCodeGeneratorBase 类内(见 angular-code-generator-base.ts)。
export * from './prop-adapter';
export * from './derive-library-maps';
export * from './tinyng/map';
export * from './tinyng/prop-adapters';
export * from './tinyng/config';
