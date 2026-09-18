import type { CardSchema, NodeSchema } from '@opentiny/genui-sdk-core';
import type { AngularPropAdapter } from './libraries/prop-adapter';

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
  /** ngAfterViewInit 里的赋值目标(不含 this.),如 'refs.myInput' */
  assignTo: string;
  /**
   * 单例还是集合:
   * - 'viewChild' —— 一个位置一个实例,`@ViewChild` 取回后直接赋给 refs;
   * - 'viewChildren' —— 循环节点上的 `this.refs.x[loopIndex]`,Angular 没有「按下标逐格写入」的
   *   等价物,改为 `@ViewChildren` 收回有序集合、整组写进 refs(顺序即 `*ngFor` 的迭代顺序)。
   */
  kind?: 'viewChild' | 'viewChildren';
  /**
   * refs 里存的是宿主元素还是查询结果本身。原生标签的查询结果是 ElementRef,而 refs 要放 DOM 元素
   * (对齐渲染器 resolveSchemaRefValue 的 location.nativeElement),故取值时需再取一层 .nativeElement。
   * 物料组件给的是组件实例、NgTemplate 给的是 TemplateRef,两者都为 false 或缺省。
   */
  unwrapNative?: boolean;
}

export interface ICodegenDescription {
  componentSet: Set<string>;
  iconComponents: { componentNames: string[]; exportNames: string[] };
  internalTypes: Set<string>;
  stateAccessors: IStateAccessorDefinition[];
  /** props.ref 收集到的 @ViewChild 声明与 ngAfterViewInit 赋值目标 */
  viewChildRefs: IViewChildRef[];
  /** 事件绑定自动生成的组件类方法(如 __handle1),随元数据走,避免实例字段需手动重置 */
  templateGeneratedMethods: string[];
  /**
   * 由 prop 提升进 schema.methods 的函数名。
   * 这类函数必须作为「值」交给子组件(而非组件自身调用),故须以箭头函数类字段产出,
   * 让函数体里的 this 恒指向组件实例;普通 schema method 仍按原型方法产出。
   */
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
 * 模板绑定的左值形态——只决定用哪种括号,与右值怎么算无关:
 * - `static`   无括号,静态属性 `k="v"`
 * - `property` 方括号,单向属性绑定 `[k]="expr"`
 * - `twoWay`   方括号+圆括号,双向绑定 `[(k)]="expr"`
 * - `event`    圆括号,事件绑定 `(k)="handler()"`
 */
export type AngularBindingKind = 'static' | 'property' | 'twoWay' | 'event';

/**
 * 模板上的一项属性——刻意保持**结构化**而非已拼接的字符串,好让后续逻辑
 * (适配器、去重、覆盖、重排、跨 prop 联动)仍能看见并操作它;
 * 真正拼成 `left=right` 只发生在写进开标签的最后一步(renderAttrs)。
 * - `left`:等号左侧,如 `[(ngModel)]`、`[disabled]`、`*ngFor`、`class`
 * - `right`:等号右侧,已由 resolveBindingRight 带好引号与转义,如 `"state.x"`、`"'请输入'"`。
 *   **缺省表示无值指令**(如原生元素上的 `tiButton`),此时只输出 left。
 */
export interface IAngularTemplateAttr {
  left: string;
  right?: string;
}

export interface IFrameworkCodeGenerator<TParams, TResult> {
  generate(params: TParams): Promise<TResult>;
}

/**
 * Angular 组件库配置——组件库专属信息以纯配置/策略注入,而非子类覆盖。
 *
 * 配置对象**住在各物料包自己的层级**,由物料包导出(如 TinyNG 的
 * `@opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator` 导出 TINYNG_CONFIG);
 * 出码器只消费,不自带任何组件库实现。经 IAngularCodeGeneratorOptions.libraries 按实例注入
 * (缺省落 DEFAULT_LIBRARIES,当前即上述物料包配置)。
 *
 * 本接口不是类的静态成员,也没有单例语义——每次构造都会展开成本实例专属的 libraryConfigs。
 */
export interface IAngularLibraryConfig {
  /** 组件名 → HTML 标签选择器，如 { TiButton: 'button', TiSelect: 'ti-select' } */
  componentSelector: Record<string, string>;
  /** 组件名 → NgModule 类名，如 { TiButton: 'TiButtonModule' } */
  moduleRefMap: Record<string, string>;
  /** 组件库 npm 包名，如 '@opentiny/ng' */
  libraryPackage: string;
  /** 原生 HTML 元素上的额外指令选择器（如 TiButton → 'tiButton'）。Angular Material 等库不需要此字段 */
  componentExtraSelector?: Record<string, string>;
  /**
   * 组件名 → 组件类名（如 { TiTable: 'TiTableComponent' }），仅供 props.ref 的 @ViewChild 字段类型推导。
   * 该类型必须能从 libraryPackage 具名导入（buildImports 会把它并入该包的 import 行）。
   */
  componentExportMap?: Record<string, string>;
  /** 标准 HTML void 元素之外的额外自闭合标签，如 ['ti-image'] */
  extraVoidElements?: string[];
  /** 组件级 prop 黑名单——这些 prop 在模板中不生成。如 { TiTable: ['border', 'stripe'] } */
  propBlacklist?: Record<string, string[]>;
  /** 组件级 prop 键名重命名(schema 键 → 组件真实键)。当前 TinyNG 无使用;通用能力保留给后续组件库 */
  propRename?: Record<string, Record<string, string>>;
  /** 组件级 prop 特判适配器列表,按序尝试,首个命中者消费该 prop。通用规则覆盖不了的值形态重塑才配置(当前 TinyNG 未使用,见物料包的 src/code-generator/record.md) */
  propAdapters?: AngularPropAdapter[];
  /** 组件库全部组件名集合,供 resolveConfig 按组件名路由到所属库;缺省取 componentSelector 的键 */
  libraryComponents?: Set<string>;
  /** 组件库专属 state 预处理(遍历/序列化前);各库只处理自己关心的 state 结构,顺序无关 */
  transformState?: (state: Record<string, unknown>) => void;
  /** 组件库专属 children 变换(子节点渲染前),如 TinyNG 的 TiFormField 子节点统一包装为 TiItem */
  transformChildren?: (
    componentName: string,
    children: NodeSchema[] | NodeSchema | string | undefined,
  ) => NodeSchema[] | NodeSchema | string | undefined;
}

export type ICodeGeneratorResult = ICodePanel;

export interface IVueCodeGeneratorOptions {
  enableCompileValidation?: boolean;
}

/** Angular 出码选项——与 Vue 出码的 IVueCodeGeneratorOptions 对齐 */
export interface IAngularCodeGeneratorOptions {
  /** prettier 格式化参数,覆盖默认值;仅 formatWithPrettier 开启时生效 */
  prettierOpts?: Record<string, unknown>;
  /**
   * 激活的组件库列表,**必传**——不传或传空数组会在构造器直接抛错。
   * 配置从对应物料包的 `code-generator` 子出口 import 后传入(见上面接口说明),
   * 出码器本身不带任何组件库配置,也不 import 任何物料包。
   *
   * 数组顺序即组件名路由的优先级顺序:一个 schema 可混用多库组件,按序查
   * libraryComponents → componentSelector → moduleRefMap,首个命中该组件的库胜出,
   * 全部未命中则兜底第一个库。
   * 硬约定:跨库组件名 / NgModule 类名需全局唯一(同名模块无法在单文件里不 alias 同时 import)。
   * 自定义库的 componentSelector / moduleRefMap / componentExtraSelector / libraryComponents
   * 必须经 deriveLibraryMaps(该库自己的物料包 materials) 推导,不可手写
   * (推导读的是物料包的 Angular 编译器元数据 ɵcmp.selectors,该工具随配置一并住在物料包内,
   * 见 @opentiny/genui-sdk-materials-angular-opentiny-ng/code-generator 的 derive-library-maps)。
   */
  libraries: IAngularLibraryConfig[];
}

/**
 * buildImports 的 @angular/core 具名导入门控——逐项独立,既不漏 import 也不 import 未使用的符号。
 * 每项都对应一处实际产出的类体代码,由调用方按「类体里到底出现了什么」计算。
 */
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

/** Angular 类体段落定义——buildAngularComponentSource 按定义顺序拼接组件类成员 */
export interface IAngularClassSectionDefinition {
  id: string;
  build: () => string;
}
