import type { Type } from '@angular/core';
import type { IRendererMaterials } from '@opentiny/tiny-schema-renderer-ng';

export type CustomMaterialInputs = {
  customComponents?: Record<string, Type<any>>;
  customComponentsModule?: Record<string, Type<any>>;
  customDirectives?: Record<string, Type<any>>;
};

/**
 * 将 GenuiRenderer 的 custom* 输入转换为物料结构，用于在物料包基础上扩展自定义组件/指令。
 *
 * @param inputs - 自定义物料输入
 * @returns 转换后的物料片段，无有效输入时返回 undefined
 */
export const collectCustomMaterials = (
  inputs: CustomMaterialInputs,
): Partial<IRendererMaterials> | undefined => {
  const customMaterials: Partial<IRendererMaterials> = {};

  if (inputs.customComponents) {
    customMaterials.components = inputs.customComponents;
  }
  if (inputs.customComponentsModule) {
    customMaterials.modules = inputs.customComponentsModule;
  }
  if (inputs.customDirectives) {
    customMaterials.directives = inputs.customDirectives;
  }

  return Object.keys(customMaterials).length ? customMaterials : undefined;
};

/**
 * 合并多个 Angular 渲染器物料配置，后者覆盖前者同名项。
 * 各技术栈物料结构不同，合并逻辑由各框架自行实现。
 *
 * @param sources - 待合并的物料配置，按顺序覆盖
 * @returns 合并后的物料配置
 */
export const mergeMaterials = (
  ...sources: Array<Partial<IRendererMaterials> | null | undefined>
): IRendererMaterials => {
  const result: IRendererMaterials = {
    components: {},
    modules: {},
    directives: {},
    autoApplyDirectives: {},
  };

  sources.forEach((source) => {
    if (!source) {
      return;
    }
    if (source.components) {
      Object.assign(result.components!, source.components);
    }
    if (source.modules) {
      Object.assign(result.modules!, source.modules);
    }
    if (source.directives) {
      Object.assign(result.directives!, source.directives);
    }
    if (source.autoApplyDirectives) {
      Object.assign(result.autoApplyDirectives!, source.autoApplyDirectives);
    }
  });

  return result;
};
