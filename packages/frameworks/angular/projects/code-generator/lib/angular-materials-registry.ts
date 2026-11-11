/**
 * 物料层：把物料配置翻成「组件名 → tag / 属性选择器 / NgModule / 组件类」的查询。
 */
import { NG_TEMPLATE_SCHEMA_NAME } from './constants';
import type { IAngularAttributeSelector, IAngularDirectiveConfig, IAngularMaterialsConfig } from './types';
import { hyphenate, TAG_NAME_RE } from './utils';

export class AngularMaterialsRegistry {
  constructor(readonly configs: readonly IAngularMaterialsConfig[]) {}
  /** 该物料包是否声明过这个组件名 */
  configDeclaresComponent(config: IAngularMaterialsConfig, componentName: string): boolean {
    return Boolean(
      config.materialsComponents?.has(componentName) ||
        config.elementSelector[componentName] ||
        config.attributeSelector?.[componentName] ||
        config.moduleRefMap[componentName],
    );
  }

  /** 是否有任一物料配置声明过这个组件名(产物自检用) */
  declaresComponent(componentName: string): boolean {
    return this.configs.some((config) => this.configDeclaresComponent(config, componentName));
  }

  /** 指令名 → 声明它的物料配置与指令配置;未声明返回 null */
  resolveDirective(directiveName: string): { config: IAngularMaterialsConfig; def: IAngularDirectiveConfig } | null {
    for (const config of this.configs) {
      const def = config.directiveMap?.[directiveName];
      if (def) {
        return { config, def };
      }
    }
    return null;
  }

  /** 是否有任一物料配置声明过这个指令名(产物自检用) */
  declaresDirective(directiveName: string): boolean {
    return this.resolveDirective(directiveName) !== null;
  }

  /** 组件名 → 对应的物料配置。 */
  resolveConfig(componentName: string): IAngularMaterialsConfig {
    if (this.configs.length === 1) return this.configs[0];
    for (const config of this.configs) {
      if (this.configDeclaresComponent(config, componentName)) {
        return config;
      }
    }
    return this.configs[0];
  }

  get voidElements(): string[] {
    const extra = new Set<string>();
    for (const config of this.configs) {
      for (const tag of config.extraVoidElements ?? []) extra.add(tag);
    }
    return [
      'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
      'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
      ...extra,
    ];
  }

  resolveComponentTag(componentName: string): string {
    const tag = this.resolveConfig(componentName).elementSelector[componentName] || hyphenate(componentName);
    // 未注册的组件名直接当标签名:脏名字会注入任意标签,退回 div
    return TAG_NAME_RE.test(tag) ? tag : 'div';
  }

  // 组件名 → 宿主元素上要挂的属性选择器(选择器是属性型的组件靠它命中
  resolveAttributeSelectors(componentName: string): IAngularAttributeSelector[] {
    return this.resolveConfig(componentName).attributeSelector?.[componentName] ?? [];
  }


  isNgTemplateComponent(componentName: string | undefined): boolean {
    return componentName === NG_TEMPLATE_SCHEMA_NAME;
  }

  // 空模板节点守卫:ng-template 无 children 时整节点丢弃。
  isEmptyTemplateNode(
    componentName: string | undefined,
    children: unknown,
  ): boolean {
    if (!this.isNgTemplateComponent(componentName)) {
      return false;
    }
    const hasChildren = Array.isArray(children) ? children.length > 0 : !!children;
    return !hasChildren;
  }
}
