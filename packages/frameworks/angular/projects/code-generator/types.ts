import type { CardSchema, NodeSchema } from '@opentiny/genui-sdk-core';
import type { AngularPropAdapter } from './libraries/prop-adapter';

/** 组件库标识:单个库名,或按注册顺序激活的库名数组(多库混合出码时用数组) */
export type AngularLibraryRef = string | string[];

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

/** JSSlot 生成的原生 ng-template 片段(Angular) */
export interface ICodegenSlotTemplate {
  /** ng-template 引用变量名(不含 #),如 'slot0' */
  ref: string;
  /** 作用域参数名,如 ['row'],映射为 ng-template 的 let-row 声明 */
  params: string[];
  /** ng-template 体(Angular 模板字符串) */
  body: string;
}

/** 含 JSSlot 而被提升为组件类字段的属性,由 ngOnInit 组装 TemplateRef 引用 */
export interface ICodegenSlotField {
  /** 组件类字段名,如 'columns' */
  fieldName: string;
  /** 待组装的数据(内部 JSSlot 已替换为 #QUOTES_START#this.slotN#QUOTES_END# 占位) */
  item: Record<string, unknown>;
}

export interface ICodegenDescription {
  componentSet: Set<string>;
  iconComponents: { componentNames: string[]; exportNames: string[] };
  internalTypes: Set<string>;
  stateAccessors: IStateAccessorDefinition[];
  slotTemplates: ICodegenSlotTemplate[];
  slotFields: ICodegenSlotField[];
  /** 事件绑定自动生成的组件类方法(如 __handle1),随元数据走,避免实例字段需手动重置 */
  templateGeneratedMethods: string[];
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

export interface IFrameworkCodeGenerator<TParams, TResult> {
  generate(params: TParams): Promise<TResult>;
}

/**
 * Angular 组件库配置——组件库专属信息以纯配置/策略注入,而非子类覆盖。
 * 不同组件库（TinyNG、Angular Material、PrimeNG 等）各提供一份配置对象:
 * 内置库(当前仅 TinyNG)登记在 angular-code-generator.ts 的 BUILTIN_LIBRARIES,
 * 其余由使用方经 IAngularCodeGeneratorOptions.libraries 按实例注入。
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
  /** 标准 HTML void 元素之外的额外自闭合标签，如 ['ti-image'] */
  extraVoidElements?: string[];
  /** 组件级 prop 黑名单——这些 prop 在模板中不生成。如 { TiTable: ['border', 'stripe'] } */
  propBlacklist?: Record<string, string[]>;
  /** 组件级 prop 键名重命名(schema 键 → 组件真实键)。当前 TinyNG 无使用;通用能力保留给后续组件库 */
  propRename?: Record<string, Record<string, string>>;
  /** 组件级 prop 特判适配器列表,按序尝试,首个命中者消费该 prop。通用规则覆盖不了的值形态重塑才配置(当前 TinyNG 未使用,见 libraries/tinyng/record.md) */
  propAdapters?: AngularPropAdapter[];
  /**
   * 表单控件组件名集合。model:true 的整值双向对这些组件走 [(ngModel)];
   * 约定(@Input key + @Output keyChange)默认出 [(key)]。
   * ngModel 是组件级指令(绑整值、不落单 prop),故必须靠名单区分,不能从 schema 推断。
   */
  formComponents?: string[];
  /** 组件库全部组件名集合,供「组件库识别」比对 schema;缺省取 componentSelector 的键 */
  libraryComponents?: Set<string>;
  /** 组件库专属 state 预处理(遍历/序列化前);各库只处理自己关心的 state 结构,顺序无关 */
  transformState?: (state: Record<string, unknown>) => void;
  /** 组件库专属 children 变换(子节点渲染前),如 TinyNG 的 TiFormField 子节点统一包装为 TiItem */
  transformChildren?: (
    componentName: string,
    children: NodeSchema[] | NodeSchema | string | undefined,
  ) => NodeSchema[] | NodeSchema | string | undefined;
}

export type ICodeGeneratorResult = ICodePanel & { errors: { message: string }[] };

export interface IVueCodeGeneratorOptions {
  enableCompileValidation?: boolean;
}

/** Angular 出码选项——与 Vue 出码的 IVueCodeGeneratorOptions 对齐 */
export interface IAngularCodeGeneratorOptions {
  /** prettier 格式化参数,覆盖默认值;仅 formatWithPrettier 开启时生效 */
  prettierOpts?: Record<string, unknown>;
  /**
   * 组件库注册表:库标识 → 库配置。与内置注册表浅合并,同名键以传入者为准;不传时仅内置库可用。
   * 自定义库的 componentSelector / moduleRefMap / componentExtraSelector / libraryComponents
   * 必须经 deriveLibraryMaps(该库自己的物料包 materials) 推导,不可手写
   * (推导依赖导入物料包时对 Angular 编译器元数据的写入,见 libraries/derive-library-maps.ts)。
   */
  libraries?: Record<string, IAngularLibraryConfig>;
  /** 默认库标识(未显式传 library 参数时使用)。缺省沿用内置 'opentiny-ng';传入值必须存在于合并后的注册表中 */
  defaultLibrary?: string;
}

/** Angular 类体段落定义——buildAngularComponentSource 按定义顺序拼接组件类成员 */
export interface IAngularClassSectionDefinition {
  id: string;
  build: () => string;
}
