// libraries/ 汇总导出——这里是「组件库」相关的抽象与实现,不是生成器。
// 生成器本体在父目录(CodeGeneratorBase / AngularCodeGenerator)。
// 目录约定:
//   - 根目录:跨组件库通用的抽象(prop-adapter / derive-library-maps)
//   - 子目录:每个组件库一组实现,如 tinyng/(map 映射推导 / config 库配置)
// 缺省库(DEFAULT_LIBRARIES,即 TinyNG)在 angular-code-generator.ts;它不持有为类静态成员,
// 实例构造时经 IAngularCodeGeneratorOptions.libraries 按序注入激活的库配置。
export * from './prop-adapter';
export * from './derive-library-maps';
export * from './tinyng/map';
export * from './tinyng/config';
