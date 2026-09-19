import type { NodeSchema } from '@opentiny/genui-sdk-core';

/**
 * 组件库出码配置的结构约定——本物料包自用的结构副本。
 *
 * 与出码器包 `types.ts` 的 `IAngularLibraryConfig` **结构一致,但刻意不跨包 import**:
 * 出码器包是 private 且无 npm 产物(直接引用 workspace 源码,见
 * sites/playground/web/vite.config.ts 的说明),而本物料包是已发布包,
 * 反向依赖它会让本包发布后 import 解析不到。
 *
 * 真正的契约校验发生在**出码器侧**:它把本包导出的配置赋给 `IAngularLibraryConfig[]` 时,
 * 若此处结构发生漂移,会在出码器包编译期报错。所以这里只求"结构对齐",不追求类型同源。
 * 出码器侧的 `propAdapters`(prop 特判适配器)本包不使用,故此处不声明——可选字段缺省
 * 不影响结构性兼容。
 */
export interface IAngularLibraryConfig {
  /** 组件名 → HTML 标签选择器,如 { TiButton: 'button', TiSelect: 'ti-select' } */
  componentSelector: Record<string, string>;
  /** 组件名 → NgModule 类名,如 { TiButton: 'TiButtonModule' } */
  moduleRefMap: Record<string, string>;
  /** 组件库 npm 包名,如 '@opentiny/ng' */
  libraryPackage: string;
  /** 原生 HTML 元素上的额外指令选择器(如 TiButton → 'tiButton') */
  componentExtraSelector?: Record<string, string>;
  /**
   * 组件名 → 组件类名(如 { TiTable: 'TiTableComponent' }),仅供 props.ref 的 @ViewChild 字段类型推导。
   * 该类型必须能从 libraryPackage 具名导入。
   */
  componentExportMap?: Record<string, string>;
  /** 标准 HTML void 元素之外的额外自闭合标签,如 ['ti-image'] */
  extraVoidElements?: string[];
  /** 组件级 prop 黑名单——这些 prop 在模板中不生成,如 { TiTable: ['border', 'stripe'] } */
  propBlacklist?: Record<string, string[]>;
  /**
   * 组件名 → 该组件**真实 @Output 名**数组(含继承自基类的),供出码器判定某个 prop 键
   * 是不是事件绑定。必须由 deriveLibraryMaps 从组件 ɵcmp.outputs 推导,不可手写。
   */
  componentOutputs?: Record<string, string[]>;
  /** 组件级 prop 键名重命名(schema 键 → 组件真实键) */
  propRename?: Record<string, Record<string, string>>;
  /** 组件库全部组件名集合,供出码器按组件名路由到所属库;缺省取 componentSelector 的键 */
  libraryComponents?: Set<string>;
  /** 组件库专属 state 预处理(遍历/序列化前) */
  transformState?: (state: Record<string, unknown>) => void;
  /** 组件库专属 children 变换(子节点渲染前),如 TiFormField 子节点统一包装为 TiItem */
  transformChildren?: (
    componentName: string,
    children: NodeSchema[] | NodeSchema | string | undefined,
  ) => NodeSchema[] | NodeSchema | string | undefined;
}
