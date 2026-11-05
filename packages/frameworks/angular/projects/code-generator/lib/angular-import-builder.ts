/**
 * import 层：按组件集把物料模块、@ViewChild 字段类型收进各自所属包的 import 行，
 * 再按类体实际用到的符号补齐 @angular/core 的导入。
 */
import type { AngularMaterialsRegistry } from './angular-materials-registry';
import type { IAngularCoreImportNeeds, ICodegenDescription } from './types';

export class AngularImportBuilder {
  constructor(private readonly registry: AngularMaterialsRegistry) {}

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
      const cfg = this.registry.resolveConfig(compName);
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
