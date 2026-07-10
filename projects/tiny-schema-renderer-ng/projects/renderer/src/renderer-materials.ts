import type { Type } from '@angular/core';

/**
 * 指令自动应用规则：key 为指令名，value 为匹配函数。
 */
export type AutoApplyDirectivePattern = Record<string, (schema: any) => boolean>;

/**
 * Angular Schema 渲染物料配置契约。
 * 渲染器（IRendererMaterials）与物料包（IMaterials）各自维护，结构须保持一致，后续将统一到 core。
 */
export interface IRendererMaterials {
  components?: Record<string, Type<any>>;
  modules?: Record<string, Type<any>>;
  directives?: Record<string, Type<any>>;
  /**
   * 指令自动应用规则。
   * 仅当 directives 中已注册同名指令时才会生效。
   */
  autoApplyDirectives?: AutoApplyDirectivePattern;
}
