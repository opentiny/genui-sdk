// libraries/ 汇总导出——这里只剩「跨组件库通用的抽象」,不是生成器。
// 生成器本体在父目录(CodeGeneratorBase / AngularCodeGenerator)。
//
// 各组件库的具体配置已迁到**物料包自己的层级**:如
// @opentiny/genui-sdk-materials-angular-opentiny-ng 的 `code-generator` 子出口
// 导出 TINYNG_CONFIG,映射推导工具 deriveLibraryMaps 也随之一并迁入物料包
// (推导读的是该物料包自己的 ɵcmp 元数据,放它自己家里最顺)。
// 本包因此不再持有任何组件库的名字,也不再反向 import 任何物料包。
export * from './prop-adapter';
