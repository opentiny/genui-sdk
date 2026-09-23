import type { NodeSchema } from '@opentiny/genui-sdk-core';

/**
 * 组件库扩展点:物料包把「只有本库才需要的节点级特殊处理」导给出码器,由出码器统一调度。
 *
 * 出码器不认识任何具体库,也不为任何库保留特判分支;没有特殊需求的库一个扩展都不用写,
 * `extensions` 留空即可。查表类的差异(标签选择器、NgModule、@Output、prop 黑名单…)不在这里,
 * 那些是声明式数据,直接写在 IAngularLibraryConfig 上。
 */
export interface IAngularLibraryExtension {
  /** 仅用于报错/调试定位,不参与组件名路由 */
  name: string;

  /**
   * 节点级特殊处理:**就地改写 node**,通常是 `node.children`,或往里合成包装节点。
   *
   * 约束:
   * - **不得返回值**。要改什么就直接改 `node` 上的槽位;写成
   *   `return node.children.map(...)` 不会生效 —— TS 允许把有返回值的函数赋给
   *   `void` 返回位置,这种写法能编译通过却静默什么都不做,出码器加了运行期守卫会当场抛错。
   * - 该钩子**只为该组件所属库**调用,但路由走 resolveConfig:组件名在
   *   `libraryComponents` / `elementSelector` / `attributeSelector` / `moduleRefMap` 里全都没命中时会兜底第一个库。
   *   所以扩展内部必须自查 `node.componentName`,别默认「轮到我 = 就是我的组件」。
   * - 调用时机在本节点的属性绑定与模板 attrs 渲染**之后**(见 AngularCodeGenerator 的节点处理顺序),
   *   所以改本节点的 `props` 不会影响本节点的 attrs —— 那时已经拼完了。它的实际用途是改
   *   **子节点**,典型场景就是把 `node.children` 换一批包装后的节点再交给递归。
   */
  transformNode?: (node: NodeSchema) => void;
}
