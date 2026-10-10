import type { CardSchema } from '@opentiny/genui-sdk-core';

export interface IComponentMapItem {
  componentName: string;
  package: string;
  exportName?: string;
}

export interface ICodeGeneratorParams {
  pageInfo: {
    schema: CardSchema | string;
    name?: string;
  };
  componentsMap?: IComponentMapItem[];
  formatWithPrettier?: boolean;
}

export interface ICodePanel {
  panelName: string;
  panelValue: string;
  panelType: 'react';
  prettierOpts: Record<string, unknown>;
  type: 'page';
}

export type ICodeGeneratorResult = ICodePanel & { errors: { message: string }[] };

export interface IReactCodeGeneratorOptions {
  prettierOpts?: Record<string, unknown>;
  enableCompileValidation?: boolean;
}

export interface IFrameworkCodeGenerator<TParams, TResult> {
  generate(params: TParams): Promise<TResult>;
}

export interface IFunctionInfo {
  async: boolean;
  params: string[];
  body: string;
}

export interface IPropDefinition {
  name: string;
  type: string;
  defaultValue?: unknown;
}

export interface ICodegenMeta {
  componentSet: Set<string>;
  needsCallAction: boolean;
  needsEffect: boolean;
  needsRef: boolean;
  needsSetIn: boolean;
  needsTextFallback: boolean;
  scopeId?: string;
}
