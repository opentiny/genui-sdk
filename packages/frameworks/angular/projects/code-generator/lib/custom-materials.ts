/**
 * 自定义组件/指令 → 物料配置。
 *
 * 一份物料配置只能有一个 import 来源(libraryPackage),所以这里按 importPath 分组:
 * 同一路径下的组件与指令合并进同一份配置,不同路径各自一份,直接追加到 materials 数组即可。
 */
import { hyphenate, MEMBER_NAME_RE, STATIC_ATTR_RE, TAG_NAME_RE } from './utils';
import type {
  IAngularCustomMaterials,
  IAngularMaterialsConfig,
} from './types';

const assertIdentifier = (value: string, field: string): void => {
  if (!MEMBER_NAME_RE.test(value)) {
    throw new Error(`defineCustomMaterials: ${field} "${value}" 不是合法的类名/符号名`);
  }
};

export function defineCustomMaterials({ components = [], directives = [] }: IAngularCustomMaterials): IAngularMaterialsConfig[] {
  const byPath = new Map<string, IAngularMaterialsConfig>();
  const configOf = (importPath: string): IAngularMaterialsConfig => {
    let cfg = byPath.get(importPath);
    if (!cfg) {
      cfg = { libraryPackage: importPath, elementSelector: {}, moduleRefMap: {} };
      byPath.set(importPath, cfg);
    }
    return cfg;
  };

  for (const item of components) {
    assertIdentifier(item.importSymbol, 'component importSymbol');
    const cfg = configOf(item.importPath);
    const tag = item.selector ?? hyphenate(item.componentName);
    if (!TAG_NAME_RE.test(tag)) {
      throw new Error(`defineCustomMaterials: 组件 "${item.componentName}" 的 selector "${tag}" 不是合法标签名`);
    }
    cfg.elementSelector[item.componentName] = tag;
    cfg.moduleRefMap[item.componentName] = item.importSymbol;
    if (item.attributeSelectors?.length) {
      (cfg.attributeSelector ??= {})[item.componentName] = item.attributeSelectors;
    }
    if (item.componentClass) {
      (cfg.componentExportMap ??= {})[item.componentName] = item.componentClass;
    }
    if (item.outputs?.length) {
      (cfg.componentOutputs ??= {})[item.componentName] = item.outputs;
    }
    if (item.propRename) {
      (cfg.propRename ??= {})[item.componentName] = item.propRename;
    }
    if (item.propBlacklist?.length) {
      (cfg.propBlacklist ??= {})[item.componentName] = item.propBlacklist;
    }
  }

  for (const item of directives) {
    assertIdentifier(item.importSymbol, 'directive importSymbol');
    if (!STATIC_ATTR_RE.test(item.selector)) {
      throw new Error(`defineCustomMaterials: 指令 "${item.directiveName}" 的 selector "${item.selector}" 不是合法属性名`);
    }
    const cfg = configOf(item.importPath);
    (cfg.directiveMap ??= {})[item.directiveName] = {
      selector: { name: item.selector },
      importSymbol: item.importSymbol,
      outputs: item.outputs,
      propRename: item.propRename,
    };
  }

  for (const cfg of byPath.values()) {
    cfg.materialsComponents = new Set(Object.keys(cfg.elementSelector));
  }
  return [...byPath.values()];
}
