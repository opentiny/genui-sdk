import type { CardSchema } from '@opentiny/genui-sdk-core';

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
  slotTemplates?: ICodegenSlotTemplate[];
  slotFields?: ICodegenSlotField[];
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
 * Angular 组件库配置——用于 AngularCodeGeneratorBase 子类注入组件库专属信息。
 * 不同的 Angular 组件库（TinyNG、Angular Material、PrimeNG 等）只需提供不同的配置对象即可。
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
  /** 组件级 prop 键名重命名。如 { TiPagination: { total: 'totalNumber' } } */
  propRename?: Record<string, Record<string, string>>;
}

export type ICodeGeneratorResult = ICodePanel & { errors: { message: string }[] };

export interface IVueCodeGeneratorOptions {
  enableCompileValidation?: boolean;
}

/** Angular 出码选项——与 Vue 出码的 IVueCodeGeneratorOptions 对齐 */
export interface IAngularCodeGeneratorOptions {
  /** prettier 格式化参数,覆盖默认值;仅 formatWithPrettier 开启时生效 */
  prettierOpts?: Record<string, unknown>;
}
