import type { CardSchema } from '@opentiny/genui-sdk-core';

export interface IComponentMapItem {
  componentName: string;
  package: string;
  exportName?: string;
}

export interface IStateAccessorDefinition {
  /** getter 名(schema 里 state 的键名) */
  name: string;

  /** getter 函数体,已把 this.state. 改写成 this.——对象字面量 getter 里的 this 就是 state 自身 */
  getterBody: string;
}

export interface IViewChildRef {
  /** schema 里 `this.refs.<name>` 的 `<name>`:只做 refs 的键,不落到模板上 */
  queryName: string;

  /** 模板里 `#token` 与 `@ViewChild('token')` 共用的查询串 */
  templateToken: string;

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
  /** 本节点外面套了几层 *ngFor */
  depth: number;
  /** 各级 *ngFor 的索引名,ref 下标合法性判定用 */
  indexVars: string[];
  /** 各级 *ngFor 引入的模板变量(item 与 index),提升成类方法的事件处理器按需接成形参 */
  templateVars: string[];
  /** 在循环里又跨过了条件渲染:被跳过的迭代不进 @ViewChildren 的结果,下标会压缩 */
  conditionalInsideLoop: boolean;
}

export interface ICodegenDescription {
  componentSet: Set<string>;
  /** #name / refName / ng-template 的 let- 变量:与循环变量同理,函数体引用到就得接成形参 */
  templateLocals: Set<string>;
  iconComponents: { componentNames: string[]; exportNames: string[] };
  stateAccessors: IStateAccessorDefinition[];

  /** props.ref 收集到的 @ViewChild 声明与 ngAfterViewInit 赋值目标 */
  viewChildRefs: IViewChildRef[];

  /** 事件绑定自动生成的组件类方法(如 __handle1),随元数据走,避免实例字段需手动重置 */
  templateGeneratedMethods: string[];

  hoistedMethodNames: Set<string>;

  /** 模板带实参调用 schema 方法时,方法签名至少要接住的形参个数(方法名 → 个数) */
  methodArityFloor: Record<string, number>;

  /** Angular 模板表达式不支持的 JS 语法(赋值/箭头等):提升成类方法,模板里改成调用 */
  templateExpressions: { name: string; body: string; vars: string[] }[];

  /** 提升表达式方法的计数,保证每次出码从 0 开始 */
  templateExprCounter: number;

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
}

/** 产物自检结果。message 与 Vue 出码的 errors 通道保持同形,playground 直接消费 */
export interface ICodegenError {
  message: string;
  /** 模板解析 / 未声明的组件 / TS 语法 / prettier 格式化 */
  code: 'TEMPLATE_PARSE' | 'UNKNOWN_COMPONENT' | 'TS_SYNTAX' | 'PRETTIER';
}

export type ICodeGeneratorResult = ICodePanel & { errors: ICodegenError[] };

export interface IAngularCodeGeneratorOptions {
  prettierOpts?: Record<string, unknown>;
  materials: IAngularMaterialsConfig[];
  /** 是否对产物做编译期自检(模板解析、组件声明、TS 语法),默认 true */
  enableCompileValidation?: boolean;
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
