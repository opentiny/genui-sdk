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

export interface ICodegenDescription {
  componentSet: Set<string>;
  iconComponents: { componentNames: string[]; exportNames: string[] };
  internalTypes: Set<string>;
  stateAccessors: IStateAccessorDefinition[];
}

export interface ICodePanel {
  panelName: string;
  panelValue: string;
  panelType: CodegenFramework;
  prettierOpts: Record<string, unknown>;
  type: 'page';
}

export interface ICodeGeneratorParams {
  pageInfo: {
    schema: CardSchema | string;
    name?: string;
  };
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
  prettierOpts?: Record<string, unknown>;
  enableCompileValidation?: boolean;
}
