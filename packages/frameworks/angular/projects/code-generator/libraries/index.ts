// libraries/ 汇总导出——这里是「组件库」相关的抽象与实现,不是生成器。
// 生成器本体在父目录(CodeGeneratorBase / AngularCodeGenerator)。
// 目录约定:
//   - 根目录:跨组件库通用的抽象(prop-adapter / derive-library-maps)
//   - 子目录:每个组件库一组实现,如 tinyng/(map 映射推导 / config 库配置)
// 内置组件库注册表(BUILTIN_LIBRARIES)在 angular-code-generator.ts;注册表本身不是类静态成员,
// 实例构造时经 IAngularCodeGeneratorOptions.libraries 注入并与内置表合并。
export * from './prop-adapter';
export * from './derive-library-maps';
export * from './tinyng/map';
export * from './tinyng/config';
