/**
 * 宿主元素上激活该组件的属性选择器。裸属性(只要有这个属性就命中)没有 value:
 * `[tiButton]` → `{ name: 'tiButton' }`;`input[type=text]` → `{ name: 'type', value: 'text' }`。
 */
export interface IAngularAttributeSelector {
  name: string;
  value?: string;
}

/** 指令配置:出码要把指令「写」进模板,所以必须知道宿主属性选择器与 import 符号 */
export interface IAngularDirectiveConfig {
  /** 宿主元素上要写出的属性选择器,如 { name: 'tiTip' };只支持属性型选择器 */
  selector: IAngularAttributeSelector;

  /** 放进 @Component({ imports: [...] }) 的符号:standalone 指令类,或指令所属 NgModule */
  importSymbol: string;

  /** 真实 @Output 名,用于把 onXxx 识别成事件绑定 */
  outputs?: string[];

  /** 指令输入名重命名(schema 键 → 指令真实键) */
  propRename?: Record<string, string>;
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

  /** 指令名 → 指令配置;schema 节点 directives 里的名字在这里查 */
  directiveMap?: Record<string, IAngularDirectiveConfig>;
}
