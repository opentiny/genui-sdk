import type { CardSchema } from '@opentiny/genui-sdk-core';
import type { IAngularMaterialsExtension } from './materials/materials-extension';

export interface IComponentMapItem {
  componentName: string;
  package: string;
  exportName?: string;
}

export interface IStateAccessorDefinition {
  name: string;
  getterExpr: string;
  setterExpr?: string;
}

/**
 * schema 的 `props.ref` 在组件类侧的全部产物:一条查询声明 + 一处 ngAfterViewInit 接线。
 * (`props.refName` 不产生本结构——它只是模板局部的 #name,组件类不需要知道。)
 */
export interface IViewChildRef {
  /** 模板引用变量名(不含 #),同时是模板里 `#name` 与查询键 */
  queryName: string;

  /** 组件类字段名,默认同 queryName;与既有类成员重名时经 avoidDuplicateString 改名 */
  fieldName: string;

  /** 字段类型:ElementRef / TemplateRef<any> / 物料组件类名 / any */
  fieldType: string;

  /** fieldType 为物料组件类名时,该类的 npm 包名(buildImports 需把它并入该包的 import 行) */
  fieldTypePackage?: string;

  /** ngAfterViewInit 里的赋值目标 */
  assignTo: string;

  kind?: 'viewChild' | 'viewChildren';
  /** 未注册物料的组件名(原生标签等动态标签)查询结果是 ElementRef, 取值时需再取一层 .nativeElement。*/
  unwrapNative?: boolean;
}


export interface ILoopScope {
  inLoop: boolean;
  indexVars: string[];
}

export interface ICodegenDescription {
  componentSet: Set<string>;
  iconComponents: { componentNames: string[]; exportNames: string[] };
  stateAccessors: IStateAccessorDefinition[];

  /** props.ref 收集到的 @ViewChild 声明与 ngAfterViewInit 赋值目标 */
  viewChildRefs: IViewChildRef[];

  /** 事件绑定自动生成的组件类方法(如 __handle1),随元数据走,避免实例字段需手动重置 */
  templateGeneratedMethods: string[];

  hoistedMethodNames: Set<string>;
  
  /** 自动生成方法计数,保证每次出码从 0 开始 */
  templateMethodCounter: number;
}

export interface ICodePanel {
  panelName: string;
  panelValue: string;
  panelType: CodegenFramework;
  /** prettier 格式化参数(与 Vue 出码一致,透出给下游面板使用) */
  prettierOpts: Record<string, unknown>;
  type: 'page';
}

export interface ICodeGeneratorParams {
  pageInfo: {
    schema: CardSchema | string;
    name?: string;
  };
  /** 是否用 prettier 格式化最终产物,默认 true(不传即输出规整代码);需原始输出时显式传 false */
  formatWithPrettier?: boolean;
}

export interface IScriptSetupBuildContext {
  schema: CardSchema;
  componentsMap: IComponentMapItem[];
  description: ICodegenDescription;
}

export interface IScriptSetupSectionDefinition {
  id: string;
  group: string;
  build: (ctx: IScriptSetupBuildContext) => string;
}

export type CodegenFramework = 'vue' | 'react' | 'angular' | (string & {});

/**
 * 模板绑定的左值形态——只决定用哪种括号:
 * - `static`   无括号,静态属性 `k="v"`
 * - `property` 方括号,单向属性绑定 `[k]="expr"`
 * - `twoWay`   方括号+圆括号,双向绑定 `[(k)]="expr"`
 * - `event`    圆括号,事件绑定 `(k)="handler()"`
 */
export type AngularBindingKind = 'static' | 'property' | 'twoWay' | 'event';

/**
 * - `left`:等号左侧,如 `[(ngModel)]`、`[disabled]`、`*ngFor`、`class`
 * - `right`:等号右侧,已由 resolveBindingRight 带好引号与转义,如 `"state.x"`、`"'请输入'"`。
 */
export interface IAngularTemplateAttr {
  left: string;
  right?: string;
}

export interface IFrameworkCodeGenerator<TParams, TResult> {
  generate(params: TParams): Promise<TResult>;
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
  /** 组件名 → 宿主元素标签选择器，如 { TiButton: 'button', TiSelect: 'ti-select' } */
  elementSelector: Record<string, string>;

  /** 组件名 → NgModule 类名，如 { TiButton: 'TiButtonModule' } */
  moduleRefMap: Record<string, string>;

  /** 组件库 npm 包名，如 '@opentiny/ng' */
  libraryPackage: string;

  /**
   * 组件名 → 宿主元素上的属性选择器数组（如 TiButton → [{ name: 'tiButton' }]，渲染成 <button tiButton>）。
   * 数组而非单个:选择器形如 `button[tiButton][data-x]` 时需要挂多个属性(罕见但合法)。
   */
  attributeSelector?: Record<string, IAngularAttributeSelector[]>;

  /** 组件名 → 组件类名（如 { TiTable: 'TiTableComponent' }），供 props.ref 的 @ViewChild 字段类型推导。*/
  componentExportMap?: Record<string, string>;

  /** 标准 HTML void 元素之外的额外自闭合标签。命中者按 `<tag />` 输出,不产闭合标签 */
  extraVoidElements?: string[];

  /** 组件级 prop 黑名单——这些 prop 在模板中不生成。如 { TiTable: ['border', 'stripe'] } */
  propBlacklist?: Record<string, string[]>;
  /**
   * 组件名 → 该组件真实 @Output 名数组(含继承自基类的),如 TiPagination →
   * 'pageNumChange', 'pageUpdate', 'focus', 'blur', 'change']。 只靠前缀“on”无法判断这些是事件还是属性
   */
  componentOutputs?: Record<string, string[]>;

  /** 组件级 prop 键名重命名(schema 键 → 组件真实键) */
  propRename?: Record<string, Record<string, string>>;

  /** 该物料包全部组件名集合,供 resolveConfig 按组件名路由到所属物料包 */
  materialsComponents?: Set<string>;

  extensions?: IAngularMaterialsExtension[];
}

export type ICodeGeneratorResult = ICodePanel;

export interface IAngularCodeGeneratorOptions {
  prettierOpts?: Record<string, unknown>;
  materials: IAngularMaterialsConfig[];
}

export interface IAngularCoreImportNeeds {
  /** 组件是否声明了 @Output(当前恒为 false,保留给后续事件输出) */
  outputs?: boolean;
  /** 是否产出 ngOnInit */
  init?: boolean;
  /** 是否产出 ngAfterViewInit */
  afterViewInit?: boolean;
  /** 是否产出 ngOnDestroy */
  destroy?: boolean;
  /** 是否产出 @ViewChild 声明 */
  viewChild?: boolean;
  /** 是否产出 @ViewChildren 声明(为真时同时需要 QueryList 类型) */
  viewChildren?: boolean;
  /** 是否有字段类型用到 ElementRef */
  elementRef?: boolean;
  /** 是否有字段类型用到 TemplateRef */
  templateRef?: boolean;
}

export interface IAngularClassSectionDefinition {
  id: string;
  build: () => string;
}
