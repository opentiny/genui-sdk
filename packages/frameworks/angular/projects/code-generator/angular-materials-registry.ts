/**
 * 物料层：把物料配置翻成「组件名 → tag / 属性选择器 / NgModule / 组件类」的查询，并按组件集算 import 清单。
 */
import { NG_TEMPLATE_SCHEMA_NAME } from './constants';
import type {
  IAngularAttributeSelector,
  IAngularCoreImportNeeds,
  IAngularMaterialsConfig,
  ICodegenDescription,
} from './types';
import { hyphenate, TAG_NAME_RE } from './utils';

export class AngularMaterialsRegistry {
  constructor(readonly configs: readonly IAngularMaterialsConfig[]) {}
  /** 该物料包是否声明过这个组件名——组件路由与 ref 类型判据共用同一张命中表 */
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

  buildImports(
    description: ICodegenDescription,
    needs: IAngularCoreImportNeeds = {},
  ): { importStatements: string; moduleNames: string[] } {
    const { componentSet } = description;
    const componentsInUse = [...componentSet];

    const moduleNames: string[] = [];
    const seenModules = new Set<string>();
    // 多物料包时模块按所属 npm 包分组,每个包生成一条 import;单物料包退化为原单行
    const modulesByPackage = new Map<string, string[]>();

    componentsInUse.forEach((compName) => {
      const cfg = this.resolveConfig(compName);
      const moduleName = cfg.moduleRefMap[compName];
      if (!moduleName || seenModules.has(moduleName)) return;
      seenModules.add(moduleName);
      moduleNames.push(moduleName);
      let list = modulesByPackage.get(cfg.libraryPackage);
      if (!list) {
        list = [];
        modulesByPackage.set(cfg.libraryPackage, list);
      }
      list.push(moduleName);
    });

    // @ViewChild 的字段类型是物料组件类名时,该符号必须与 NgModule 落在同一条 import 里,
    // 否则产物报 `Cannot find name 'TiTableComponent'`。
    // 只并入 modulesByPackage(import 行);moduleNames 会进 @Component({imports:[…]}),
    description.viewChildRefs.forEach((item) => {
      if (!item.fieldTypePackage) {
        return;
      }
      let list = modulesByPackage.get(item.fieldTypePackage);
      if (!list) {
        list = [];
        modulesByPackage.set(item.fieldTypePackage, list);
      }
      if (!list.includes(item.fieldType)) {
        list.push(item.fieldType);
      }
    });

    const lines: string[] = [];

    const coreImports = ['Component'];
    if (needs.outputs) {
      coreImports.push('Output', 'EventEmitter');
    }
    if (needs.init) {
      coreImports.push('OnInit');
    }
    if (needs.afterViewInit) {
      coreImports.push('AfterViewInit');
    }
    if (needs.destroy) {
      coreImports.push('OnDestroy');
    }
    if (needs.viewChild) {
      coreImports.push('ViewChild');
    }
    if (needs.viewChildren) {
      coreImports.push('ViewChildren', 'QueryList');
    }
    // 字段类型用到的符号由已生成的声明串反查,避免「类型来源」与「导入清单」两处手工维护而漂移
    if (needs.elementRef) {
      coreImports.push('ElementRef');
    }
    if (needs.templateRef) {
      coreImports.push('TemplateRef');
    }
    lines.push(`import { ${coreImports.join(', ')} } from '@angular/core';`);
    lines.push("import { CommonModule } from '@angular/common';");
    lines.push("import { FormsModule } from '@angular/forms';");

    for (const [pkg, mods] of modulesByPackage) {
      lines.push(`import { ${mods.join(', ')} } from '${pkg}';`);
    }

    return { importStatements: lines.join('\n'), moduleNames };
  }
}
