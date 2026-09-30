import type { NodeSchema } from '@opentiny/genui-sdk-core';

export interface IAngularMaterialsExtension {
  name: string;
  /** 节点级特殊处理:就地改写 node */
  transformNode?: (node: NodeSchema) => void;
}

/**
 * 宿主元素上激活该组件的属性选择器。裸属性(只要有这个属性就命中)没有 value:
 * `[tiButton]` → `{ name: 'tiButton' }`;`input[type=text]` → `{ name: 'type', value: 'text' }`。
 */
export interface IAngularAttributeSelector {
  name: string;
  value?: string;
}

export interface IAngularMaterialsConfig {

  /** 组件名 → 宿主元素标签选择器,如 { TiButton: 'button', TiSelect: 'ti-select' } */
  elementSelector: Record<string, string>;

  /** 组件名 → NgModule 类名,如 { TiButton: 'TiButtonModule' } */
  moduleRefMap: Record<string, string>;

  /** 组件库 npm 包名,如 '@opentiny/ng' */
  libraryPackage: string;

  /**
   * 组件名 → 宿主元素上的属性选择器数组,如 { TiButton: [{ name: 'tiButton' }] }。
   * 数组而非单个:选择器形如 `button[tiButton][data-x]` 时需要挂多个属性(罕见但合法)。
   */
  attributeSelector?: Record<string, IAngularAttributeSelector[]>;

  /** 组件名 → 组件类名(如 { TiTable: 'TiTableComponent' }),仅供 props.ref 的 @ViewChild 字段类型推导。*/
  componentExportMap?: Record<string, string>;

  /** 标准 HTML void 元素之外的额外自闭合标签:命中者按 `<tag />` 输出,不产闭合标签*/
  extraVoidElements?: string[];

  /** 组件级 prop 黑名单——这些 prop 在模板中不生成,如 { TiTable: ['border', 'stripe'] } */
  propBlacklist?: Record<string, string[]>;

  /** 组件名 → 该组件真实 Output 名 */
  componentOutputs?: Record<string, string[]>;

  /** 组件级 prop 键名重命名(schema 键 → 组件真实键) */
  propRename?: Record<string, Record<string, string>>;

  /** 该物料包全部组件名集合,供出码器按组件名路由到所属物料包;缺省取 elementSelector 的键 */
  materialsComponents?: Set<string>;

  extensions?: IAngularMaterialsExtension[];
}
