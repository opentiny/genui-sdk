/**
 * 从 Angular 组件库物料包自动推导组件映射表(通用,各组件库复用)。
 *
 * 原理:物料包已收集 组件名 → 组件类 / 模块类。组件类的 Angular 编译器
 * 元数据 ɵcmp.selectors 含真实选择器(结构为 [tag, attr, cls]),模块类的
 * .name 即 NgModule 类名,由此推导:
 *   - componentSelector      : 元素型 selector 的 tag,如 ['ti-select'] → ti-select
 *   - componentExtraSelector : 属性型 selector 的 attr,如 ['', 'tiButton', ''] → [tiButton]
 *   - moduleRefMap           : 组件名 → NgModule 类名,如 TiTabs → TiTabModule
 *   - libraryComponents      : 该库全部组件名集合(供「组件库识别」比对 schema)
 *
 * 注意:部分原生表单组件在物料包中被显式补齐了宿主标签 selector,
 * 但仍有个别组件(如 TinyNG 的 TiButton/TiText 等)的宿主标签只存在于
 * 库的使用约定中、无法从元数据推导,由调用方通过 hostTagOverride 提供最小覆盖。
 */
export interface IAngularMaterials {
  components?: Record<string, unknown>;
  modules?: Record<string, unknown>;
}

export interface IAngularLibraryMaps {
  componentSelector: Record<string, string>;
  componentExtraSelector: Record<string, string>;
  moduleRefMap: Record<string, string>;
  libraryComponents: Set<string>;
}

/** Angular 组件编译器元数据(ɵcmp)中的 selectors 结构:[tag, attr, cls] */
interface IAngularCmpMeta {
  selectors?: Array<[string, string, string]>;
}

const readCmpMeta = (cls: unknown): IAngularCmpMeta | undefined => (cls as any)?.['ɵcmp'];

export function deriveLibraryMaps(
  materials: IAngularMaterials,
  hostTagOverride: Record<string, string> = {},
): IAngularLibraryMaps {
  const componentSelector: Record<string, string> = {};
  const componentExtraSelector: Record<string, string> = {};
  const moduleRefMap: Record<string, string> = {};

  Object.entries(materials.components ?? {}).forEach(([name, cls]) => {
    const entry = readCmpMeta(cls)?.selectors?.[0];
    if (entry?.[0]) componentSelector[name] = entry[0];

    if (entry && typeof entry[1] === 'string' && entry[1]) {
      componentExtraSelector[name] = entry[1];
    }
  });

  Object.entries(materials.modules ?? {}).forEach(([name, mod]) => {
    moduleRefMap[name] = (mod as any).name;
  });

  // 宿主标签覆盖:组件类元数据缺失 tag 时按库的使用约定补齐(见文件头注释)
  Object.entries(hostTagOverride).forEach(([name, tag]) => {
    componentSelector[name] = tag;
  });

  return {
    componentSelector,
    componentExtraSelector,
    moduleRefMap,
    libraryComponents: new Set(Object.keys(materials.components ?? {})),
  };
}
